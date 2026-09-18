import crypto from 'crypto';
import mongoose from 'mongoose';
import { Buyer } from '../models/buyer.model.js';
import { Customer } from '../models/customer.model.js';
import { Order } from '../models/order.model.js';
import { Payment } from '../models/payment.model.js';
import { Product } from '../models/product.model.js';
import { Retailer } from '../models/retailer.model.js';
import { reserveStock } from './inventory.service.js';
import { env } from '../config/env.js';
import { checkServiceability } from './shipping.service.js';

const createReference = (prefix) => `${prefix}-${crypto.randomUUID().replaceAll('-', '').slice(0, 18).toUpperCase()}`;

/**
 * Creates one seller order per retailer for a buyer's cart. This service is not
 * routed publicly until buyer authentication and Razorpay checkout are added.
 */
export const createMarketplaceCheckout = async ({ buyer, items, shippingAddress, paymentMethod = 'UPI', idempotencyKey }) => {
  if (!idempotencyKey) throw new Error('An idempotency key is required for checkout.');
  if (!items?.length) throw new Error('Cart must contain at least one item.');

  const existingPayment = await Payment.findOne({ idempotencyKey }).populate('orderIds');
  if (existingPayment) {
    if (existingPayment.status === 'FAILED') {
      const error = new Error('This checkout attempt has already failed. Please start checkout again with a new idempotency key.');
      error.statusCode = 409;
      throw error;
    }
    return { payment: existingPayment, orders: existingPayment.orderIds, reused: true };
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isDeleted: false, status: 'ACTIVE' });
  if (products.length !== productIds.length) throw new Error('One or more cart products are no longer available.');

  const productMap = new Map(products.map((product) => [product.id, product]));
  const groupedItems = new Map();
  for (const cartItem of items) {
    const product = productMap.get(String(cartItem.productId));
    if (!product || !Number.isInteger(cartItem.quantity) || cartItem.quantity < 1) throw new Error('Cart contains an invalid item.');
    const group = groupedItems.get(product.retailerId.toString()) || [];
    group.push({ product, quantity: cartItem.quantity });
    groupedItems.set(product.retailerId.toString(), group);
  }

  const sellerIds = [...groupedItems.keys()];
  const sellers = await Retailer.find({ _id: { $in: sellerIds }, isActive: true, sellerStatus: 'APPROVED' });
  if (sellers.length !== sellerIds.length) throw new Error('One or more sellers are currently unavailable.');
  const shippingByRetailer = new Map();
  for (const seller of sellers) {
    const sellerItems = groupedItems.get(seller.id) || [];
    const packageDetails = {
      weight: Number(sellerItems.reduce((sum, item) => sum + Number(item.product.logistics?.weightKg || env.SHIPPING_DEFAULT_WEIGHT_KG) * item.quantity, 0).toFixed(2)),
      length: Math.max(...sellerItems.map((item) => Number(item.product.logistics?.lengthCm || env.SHIPPING_DEFAULT_LENGTH_CM))),
      breadth: Math.max(...sellerItems.map((item) => Number(item.product.logistics?.breadthCm || env.SHIPPING_DEFAULT_BREADTH_CM))),
      height: Number(sellerItems.reduce((sum, item) => sum + Number(item.product.logistics?.heightCm || env.SHIPPING_DEFAULT_HEIGHT_CM) * item.quantity, 0).toFixed(2)),
    };
    const serviceability = await checkServiceability({ pickupPincode: seller.pincode, deliveryPincode: shippingAddress.pincode, paymentMethod, packageDetails });
    if (!serviceability.serviceable) throw Object.assign(new Error(`Delivery is unavailable from ${seller.shopName} to this PIN code.`), { statusCode: 400 });
    // Delivery remains serviceability-checked, but shipping is free and must
    // never change the buyer-facing or payment total.
    shippingByRetailer.set(seller.id, 0);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      let buyerRecord = await Buyer.findOne({ phone: buyer.phone }).session(session);
      if (!buyerRecord) buyerRecord = await Buyer.create([{ ...buyer, defaultAddress: shippingAddress }], { session }).then(([record]) => record);

      const checkoutReference = createReference('CHK');
      const orderIds = [];
      let totalAmount = 0;
      const paymentId = new mongoose.Types.ObjectId();

      for (const [retailerId, sellerItems] of groupedItems) {
        let customer = await Customer.findOne({ retailerId, phone: buyerRecord.phone, isDeleted: false }).session(session);
        if (!customer) {
          customer = await Customer.create([{ retailerId, name: buyerRecord.name, phone: buyerRecord.phone, email: buyerRecord.email, addresses: [{ ...shippingAddress, isDefault: true }] }], { session }).then(([record]) => record);
        }

        let subtotal = 0; let tax = 0;
        const orderItems = [];
        for (const { product, quantity } of sellerItems) {
          const pricing = product.pricing;
          await reserveStock({ retailerId, productId: product._id, quantity, session });
          const itemSubtotal = pricing.sellingPrice * quantity;
          const itemTax = (itemSubtotal * (pricing.tax || 0)) / 100;
          subtotal += itemSubtotal; tax += itemTax;
          orderItems.push({ productId: product._id, productName: product.name, sku: product.sku, quantity, price: pricing.sellingPrice, discount: pricing.discount || 0, tax: itemTax, subtotal: itemSubtotal, logistics: product.logistics || {} });
        }

        const shipping = shippingByRetailer.get(retailerId) || 0;
        const grandTotal = subtotal + tax + shipping;
        totalAmount += grandTotal;
        const order = new Order({
          _id: new mongoose.Types.ObjectId(), orderNumber: createReference('ORD'), checkoutReference, paymentId,
          retailerId, buyerId: buyerRecord._id, customerId: customer._id, items: orderItems, subtotal, tax, discount: 0, shipping, grandTotal,
          paymentStatus: 'PENDING', paymentMethod, orderStatus: 'PENDING', shippingAddress,
          timeline: [{ status: 'PENDING', comment: 'Marketplace checkout created; awaiting payment confirmation.' }],
        });
        await order.save({ session }); orderIds.push(order._id);
      }

      const payment = new Payment({ _id: paymentId, checkoutReference, buyerId: buyerRecord._id, orderIds, amount: totalAmount, currency: 'INR', provider: env.PAYMENT_PROVIDER.toUpperCase(), idempotencyKey, metadata: { sellerCount: sellerIds.length } });
      await payment.save({ session });
      result = { payment, orders: await Order.find({ _id: { $in: orderIds } }).session(session), reused: false };
    });
    return result;
  } finally { await session.endSession(); }
};
