import { describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { createCheckout } from '../src/controllers/marketplaceCheckout.controller.js';
import { Buyer } from '../src/models/buyer.model.js';
import { Inventory } from '../src/models/inventory.model.js';
import { Order } from '../src/models/order.model.js';
import { Payment } from '../src/models/payment.model.js';
import { Product } from '../src/models/product.model.js';
import { Retailer } from '../src/models/retailer.model.js';

const sellerFields = (suffix) => ({
  shopName: `Checkout Shop ${suffix}`,
  ownerName: `Checkout Owner ${suffix}`,
  phone: `+91980000${suffix}01`,
  email: `checkout-${suffix}@example.com`,
  passwordHash: 'test-only-password-hash',
  address: 'Test Market Road',
  city: 'Delhi',
  state: 'Delhi',
  pincode: '110001',
  panNumber: 'ABCDE1234F',
  mainCategory: 'electronics',
  bankDetails: {
    accountHolderName: `Checkout Owner ${suffix}`,
    accountNumberLast4: '1234',
    ifscCode: 'HDFC0001234',
    bankName: 'Test Bank',
    branchName: 'Test Branch',
  },
  sellerAgreement: { accepted: true, acceptedAt: new Date() },
  sellerStatus: 'APPROVED',
  isActive: true,
});

const productFields = ({ retailerId, sku, name }) => ({
  retailerId,
  name,
  slug: `${sku.toLowerCase()}-${new mongoose.Types.ObjectId()}`,
  sku,
  globalCategoryId: new mongoose.Types.ObjectId(),
  pricing: { mrp: 1200, sellingPrice: 1000, purchasePrice: 700, tax: 0 },
  inventory: { stockQuantity: 2, lowStockThreshold: 1 },
  logistics: { weightKg: 0.5, lengthCm: 20, breadthCm: 15, heightCm: 10 },
  status: 'ACTIVE',
  createdBy: retailerId,
});

describe('Marketplace checkout provider failure compensation', () => {
  it('cleans up all seller orders and reservations when provider order creation fails', async () => {
    const suffix = String(Date.now()).slice(-5);
    const buyer = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Checkout Buyer',
      phone: `+9197000${suffix}`,
      email: `buyer-${suffix}@example.com`,
      city: 'Delhi',
    };
    const sellers = await Retailer.create([
      sellerFields(`${suffix}1`),
      sellerFields(`${suffix}2`),
    ]);
    const products = await Product.create([
      productFields({ retailerId: sellers[0]._id, sku: `CHK-${suffix}-A`, name: 'Seller One Product' }),
      productFields({ retailerId: sellers[1]._id, sku: `CHK-${suffix}-B`, name: 'Seller Two Product' }),
    ]);
    await Inventory.create(products.map((product) => ({
      retailerId: product.retailerId,
      productId: product._id,
      currentStock: 2,
      reservedStock: 0,
      lowStockThreshold: 1,
    })));

    const idempotencyKey = `checkout-failure-${suffix}`;
    const request = {
      buyer,
      body: {
        items: products.map((product) => ({ productId: product.id, quantity: 1 })),
        shippingAddress: {
          street: 'Buyer Test Street',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
        },
      },
      get: (header) => header === 'Idempotency-Key' ? idempotencyKey : undefined,
    };
    const response = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    let nextError;
    const originalFetch = globalThis.fetch;
    const originalProviderFailure = process.env.TEST_PROVIDER_ORDER_FAILURE;
    process.env.TEST_PROVIDER_ORDER_FAILURE = 'true';
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: { description: 'Gateway unavailable for test' } }),
    }));

    try {
      await new Promise((resolve) => createCheckout(request, response, (error) => {
        nextError = error;
        resolve();
      }));

      expect(nextError).toBeDefined();
      expect(nextError.statusCode).toBe(502);
      const payment = await Payment.findOne({ idempotencyKey });
      expect(payment).toBeDefined();
      expect(payment.status).toBe('FAILED');
      expect(payment.failureReason).toMatch(/Gateway unavailable/);
      expect(payment.orderIds).toHaveLength(2);

      const orders = await Order.find({ paymentId: payment._id });
      expect(orders).toHaveLength(2);
      expect(orders.every((order) => order.orderStatus === 'CANCELLED')).toBe(true);
      expect(orders.every((order) => order.paymentStatus === 'FAILED')).toBe(true);

      const inventories = await Inventory.find({ productId: { $in: products.map((product) => product._id) } });
      expect(inventories.every((inventory) => inventory.reservedStock === 0)).toBe(true);
      expect(inventories.every((inventory) => inventory.currentStock === 2)).toBe(true);

      let retryError;
      await new Promise((resolve) => createCheckout(request, response, (error) => {
        retryError = error;
        resolve();
      }));
      expect(retryError.statusCode).toBe(409);
      expect(retryError.message).toMatch(/already failed/i);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalProviderFailure === undefined) delete process.env.TEST_PROVIDER_ORDER_FAILURE;
      else process.env.TEST_PROVIDER_ORDER_FAILURE = originalProviderFailure;
      const payment = await Payment.findOne({ idempotencyKey }).select('orderIds');
      const orderIds = payment?.orderIds || [];
      await Payment.deleteMany({ idempotencyKey });
      await Order.deleteMany({ _id: { $in: orderIds } });
      await Inventory.deleteMany({ productId: { $in: products.map((product) => product._id) } });
      await Product.deleteMany({ _id: { $in: products.map((product) => product._id) } });
      await Retailer.deleteMany({ _id: { $in: sellers.map((seller) => seller._id) } });
      await Buyer.deleteOne({ phone: buyer.phone });
    }
  });
});
