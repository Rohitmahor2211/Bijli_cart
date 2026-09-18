import crypto from 'crypto';
import mongoose from 'mongoose';
import { Order } from '../models/order.model.js';
import { SellerLedger } from '../models/sellerLedger.model.js';
import { Product } from '../models/product.model.js';
import { Customer } from '../models/customer.model.js';
import { Inventory } from '../models/inventory.model.js';
import { Notification } from '../models/notification.model.js';
import {
  reserveStock,
  releaseReservedStock,
  commitReservedStockToSale,
  updateStockQuantity,
} from '../services/inventory.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, formatPaginationMeta } from '../utils/pagination.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { logger } from '../utils/logger.js';
import { requestMarketplaceRefund, reverseSellerLedgerForRefund } from '../services/payment.service.js';
import { getOrderNotificationDetails, notifyBuyer, notifyPlatformAdmins, notifySeller } from '../services/notification.service.js';
import { allowedOrderTransitions, canTransitionOrder } from '../utils/orderTransitions.js';

const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${dateStr}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
};

export const createOrder = asyncWrapper(async (req, res) => {
  const { customerId, items, shippingAddress, paymentMethod, discount: orderDiscount = 0, shipping = 0 } = req.body;

  // 1. Verify customer exists for retailer
  const customer = await Customer.findOne({
    _id: customerId,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!customer) {
    return sendError(res, 'Customer not found.', null, 404);
  }

  // 2. Validate products & calculate totals
  const orderItems = [];
  let calculatedSubtotal = 0;
  let totalTax = 0;

  for (const item of items) {
    const product = await Product.findOne({
      _id: item.productId,
      retailerId: req.retailerId,
      isDeleted: false,
    });

    if (!product) {
      return sendError(res, `Product with ID '${item.productId}' not found.`, null, 400);
    }

    if (product.status !== 'ACTIVE') {
      return sendError(res, `Product '${product.name}' is currently inactive.`, null, 400);
    }
    const pricing = product.pricing;
    const logistics = product.logistics;

    // Check available stock
    const inventory = await Inventory.findOne({
      retailerId: req.retailerId,
      productId: product._id,
    });

    const availableStock = inventory ? inventory.currentStock - inventory.reservedStock : 0;
    if (availableStock < item.quantity) {
      return sendError(
        res,
        `Insufficient stock for '${product.name}'. Available: ${availableStock}, Requested: ${item.quantity}`,
        null,
        400
      );
    }

    const price = pricing.sellingPrice;
    const itemTaxPercentage = pricing.tax || 0;
    const itemSubtotal = price * item.quantity;
    const itemTax = (itemSubtotal * itemTaxPercentage) / 100;

    calculatedSubtotal += itemSubtotal;
    totalTax += itemTax;

    // Item snapshot
    orderItems.push({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: item.quantity,
      price,
      discount: pricing.discount || 0,
      tax: itemTax,
      subtotal: itemSubtotal,
      logistics,
    });
  }

  const grandTotal = Math.max(0, calculatedSubtotal + totalTax + Number(shipping) - Number(orderDiscount));
  const orderNumber = generateOrderNumber();

  // Start MongoDB Session for atomic transaction
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    // Reserve stock for each product
    for (const item of items) {
      await reserveStock({
        retailerId: req.retailerId,
        productId: item.productId,
        quantity: item.quantity,
        session: mongoSession,
      });
    }

    // Create Order Document
    const order = new Order({
      orderNumber,
      retailerId: req.retailerId,
      customerId: customer._id,
      items: orderItems,
      subtotal: calculatedSubtotal,
      discount: Number(orderDiscount),
      tax: totalTax,
      shipping: Number(shipping),
      grandTotal,
      paymentStatus: 'PENDING',
      paymentMethod: paymentMethod || 'CASH',
      orderStatus: 'PENDING',
      shippingAddress,
      timeline: [
        {
          status: 'PENDING',
          comment: 'Order placed and stock reserved.',
          timestamp: new Date(),
        },
      ],
    });

    await order.save({ session: mongoSession });

    // Update Customer Order stats
    customer.totalOrders += 1;
    customer.totalSpent += grandTotal;
    customer.lastOrderAt = new Date();
    await customer.save({ session: mongoSession });

    // Create Notification
    await Notification.create(
      [
        {
          retailerId: req.retailerId,
          type: 'NEW_ORDER',
          title: 'New Order Received',
          message: `Order #${orderNumber} placed for ₹${grandTotal} by ${customer.name}.`,
          metadata: { orderId: order._id, orderNumber },
        },
      ],
      { session: mongoSession }
    );

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    logger.info(`Order created: ${orderNumber} (Grand total: ₹${grandTotal})`);

    return sendSuccess(res, 'Order created successfully.', { order }, 201);
  } catch (error) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    throw error;
  }
});

export const getOrders = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { status, paymentStatus, customer, dateFrom, dateTo, search } = req.query;

  const filter = {
    retailerId: req.retailerId,
    isDeleted: false,
  };

  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (customer) filter.customerId = customer;

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [{ orderNumber: searchRegex }];
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customerId', 'name phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  const paginationMeta = formatPaginationMeta(total, page, limit);

  return sendSuccess(res, 'Orders fetched successfully.', { orders }, 200, paginationMeta);
});

export const getOrderById = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  }).populate('customerId', 'name phone email addresses');

  if (!order) {
    return sendError(res, 'Order not found.', null, 404);
  }

  return sendSuccess(res, 'Order details fetched.', { order });
});

export const updateOrderShippingAddress = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    retailerId: req.retailerId,
    isDeleted: false,
    orderStatus: 'PROCESSING',
  });
  if (!order) return sendError(res, 'Only processing orders can have their delivery address corrected.', null, 400);

  order.shippingAddress = req.body.shippingAddress;
  order.timeline.push({
    status: order.orderStatus,
    comment: 'Delivery address was corrected before shipment creation.',
    timestamp: new Date(),
  });
  await order.save();
  return sendSuccess(res, 'Delivery address updated. Shipment can now be created.', { order });
});

export const updateOrderStatus = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { status, comment } = req.body;

  const order = await Order.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!order) {
    return sendError(res, 'Order not found.', null, 404);
  }

  if (!canTransitionOrder(order.orderStatus, status)) {
    return sendError(res, `Order cannot move from ${order.orderStatus} to ${status}.`, null, 400);
  }

  const previousStatus = order.orderStatus;
  order.orderStatus = status;
  order.timeline.push({
    status,
    comment: comment || `Order status updated to ${status}`,
    timestamp: new Date(),
  });

  // Legacy cash orders commit their reservation on delivery. Marketplace orders
  // have already committed stock when Razorpay payment was captured.
  if (status === 'DELIVERED' && previousStatus !== 'DELIVERED') {
    if (order.paymentStatus === 'PENDING') {
      for (const item of order.items) {
        await commitReservedStockToSale({ retailerId: req.retailerId, productId: item.productId, quantity: item.quantity });
      }
      order.paymentStatus = 'PAID';
    }
  }

  await order.save();
  return sendSuccess(res, `Order status updated to ${status}.`, { order });
});

export const updateOrderFulfilment = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, retailerId: req.retailerId, isDeleted: false });
  if (!order) return sendError(res, 'Order not found.', null, 404);
  const { status, carrier, trackingNumber, trackingUrl, comment } = req.body;
  const previousStatuses = Object.entries(allowedOrderTransitions)
    .filter(([, nextStatuses]) => nextStatuses.includes(status))
    .map(([previousStatus]) => previousStatus);
  if (!previousStatuses.includes(order.orderStatus)) {
    return sendError(res, `Order must be ${previousStatuses.join(' or ')} before it can move to ${status}.`, null, 400);
  }
  if (status === 'ACCEPTED' && !['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.orderStatus)) return sendError(res, 'Only pending orders can be accepted.', null, 400);
  if (status === 'ACCEPTED' && order.paymentStatus !== 'PAID') return sendError(res, 'Only paid orders can be accepted.', null, 400);
  if (status === 'DELIVERED' && !['ACCEPTED', 'CONFIRMED', 'PROCESSING'].includes(order.orderStatus)) return sendError(res, 'Only accepted orders can be marked delivered.', null, 400);
  if (status === 'DELIVERED') {
    order.sellerPaymentStatus = 'PENDING';
    if (order.paymentStatus === 'PENDING') {
      for (const item of order.items) await commitReservedStockToSale({ retailerId: req.retailerId, productId: item.productId, quantity: item.quantity });
      order.paymentStatus = 'PAID';
    }
  }
  if (status === 'ACCEPTED') {
    order.acceptedAt = new Date();
    order.acceptedBy = req.retailerId;
  }
  if (status === 'DELIVERED') {
    order.deliveredAt = new Date();
    order.deliveredBy = req.retailerId;
  }
  order.orderStatus = status;
  order.timeline.push({ status, comment: comment || `Seller marked the order ${status.toLowerCase()}.`, timestamp: new Date() });
  await order.save();
  if (status === 'ACCEPTED') {
    const details = await getOrderNotificationDetails(order);
    await notifyBuyer({ buyerId: order.buyerId, type: 'ORDER_ACCEPTED', title: 'Order accepted', message: `${details.sellerName} accepted ${details.orderNumber} from ${details.shopName}. Product: ${details.productSummary}.`, metadata: { orderId: order._id } });
    await notifySeller({ retailerId: order.retailerId, type: 'ORDER_ACCEPTED', title: 'Order accepted', message: `You accepted ${details.orderNumber}. Product: ${details.productSummary}. Amount: ₹${details.orderTotal.toLocaleString('en-IN')}.`, metadata: { orderId: order._id } });
    await notifyPlatformAdmins({
      type: 'ORDER_ACCEPTED',
      title: 'Order accepted by seller',
      message: `Order ${details.orderNumber} accepted by ${details.sellerName} (${details.shopName}). Product: ${details.productSummary}. Total: ₹${details.orderTotal.toLocaleString('en-IN')}.`,
      metadata: { orderId: order._id, orderNumber: details.orderNumber, sellerName: details.sellerName, shopName: details.shopName, products: details.products, amount: details.orderTotal, badge: 'ACCEPTED' },
    });
  }
  if (status === 'DELIVERED') await notifyBuyer({ buyerId: order.buyerId, type: 'ORDER_DELIVERED', title: 'Order delivered', message: `${order.orderNumber} has been marked delivered.`, metadata: { orderId: order._id } });
  return sendSuccess(res, `Order marked ${status.toLowerCase()}.`, { order });
});

export const updateOrderPaymentStatus = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, paymentMethod } = req.body;

  const order = await Order.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!order) {
    return sendError(res, 'Order not found.', null, 404);
  }

  if (order.paymentStatus === paymentStatus) {
    return sendSuccess(res, 'Payment status is already up to date.', { order });
  }
  if (order.paymentStatus === 'REFUNDED' || (order.paymentStatus === 'PAID' && paymentStatus === 'PENDING')) {
    return sendError(res, `Payment cannot move from ${order.paymentStatus} to ${paymentStatus}.`, null, 400);
  }
  order.paymentStatus = paymentStatus;
  if (paymentMethod) order.paymentMethod = paymentMethod;

  await order.save();
  await notifyBuyer({ buyerId: order.buyerId, type: 'ORDER_CANCELLED', title: 'Order cancelled', message: `${order.orderNumber} payment status changed to ${paymentStatus}.`, metadata: { orderId: order._id } });
  return sendSuccess(res, `Payment status updated to ${paymentStatus}.`, { order });
});

export const cancelOrder = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = await Order.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!order) {
    return sendError(res, 'Order not found.', null, 404);
  }

  if (order.orderStatus === 'CANCELLED') {
    return sendSuccess(res, 'Order was already cancelled.', { order });
  }

  if (order.orderStatus === 'DELIVERED') {
    return sendError(res, 'Delivered order cannot be cancelled. Use return endpoint instead.', null, 400);
  }

  let refund = null;
  // Marketplace stock was committed at payment capture, while legacy cash
  // orders still have a reservation to release.
  if (order.paymentStatus === 'PAID') {
    refund = await requestMarketplaceRefund({ order, reason: reason || 'Seller cancelled the order.' });
    logger.info('Seller cancellation refund function returned', {
      source: 'src/controllers/order.controller.js:395',
      orderId: String(order._id),
      refundAmount: refund?.refund?.amount || 0,
      refundStatus: refund?.refund?.status || 'NOT_REQUESTED',
      providerRefundId: refund?.refund?.providerRefundId || null,
    });
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await Order.findById(order._id).session(session);
      if (current.paymentStatus === 'PAID') {
        for (const item of current.items) await updateStockQuantity({ retailerId: req.retailerId, productId: item.productId, changeQuantity: item.quantity, reason: `Seller cancellation: ${current.orderNumber}`, type: 'RETURN', createdBy: req.retailerId, session });
      } else {
        for (const item of current.items) await releaseReservedStock({ retailerId: req.retailerId, productId: item.productId, quantity: item.quantity, session });
      }
      if (refund) {
        await SellerLedger.updateMany(
          { orderId: current._id, entryType: { $in: ['SALE', 'COMMISSION'] }, status: { $in: ['PENDING', 'AVAILABLE'] } },
          { $set: { status: 'VOID', 'metadata.refundStatus': refund.processed ? 'PROCESSED' : 'REQUESTED', 'metadata.cancelledAt': new Date() } },
          { session },
        );
      }
      current.orderStatus = 'CANCELLED';
      current.sellerPaymentStatus = 'CANCELLED';
      current.refundStatus = refund?.processed ? 'COMPLETED' : 'PROCESSING';
      current.cancellation = { cancelledBy: 'RETAILER', cancelledById: req.retailerId, reason: reason || 'Seller cancelled the order.', cancelledAt: new Date() };
      current.refund = { amount: current.grandTotal, providerRefundId: refund?.refund?.providerRefundId || '', initiatedAt: new Date(), completedAt: refund?.processed ? new Date() : null };
      if (refund?.processed) { current.paymentStatus = 'REFUNDED'; await reverseSellerLedgerForRefund({ order: current, paymentId: current.paymentId, session }); }
      current.timeline.push({ status: 'CANCELLED', comment: reason || 'Order cancelled by retailer.', timestamp: new Date() });
      await current.save({ session });
      Object.assign(order, current.toObject());
    });
  } finally {
    await session.endSession();
  }
  const details = await getOrderNotificationDetails(order);
  await notifyBuyer({ buyerId: order.buyerId, type: 'ORDER_CANCELLED', title: 'Order cancelled', message: `${details.orderNumber} was cancelled by ${details.sellerName} (${details.shopName}). Product: ${details.productSummary}.`, metadata: { orderId: order._id } });
  await notifyPlatformAdmins({
    type: 'ORDER_CANCELLED',
    title: 'Order cancelled by seller',
    message: `Order ${details.orderNumber} cancelled by ${details.sellerName} (${details.shopName}). Product: ${details.productSummary}. Total: ₹${details.orderTotal.toLocaleString('en-IN')}.`,
    metadata: { orderId: order._id, orderNumber: details.orderNumber, sellerName: details.sellerName, shopName: details.shopName, products: details.products, amount: details.orderTotal, badge: 'CANCELLED' },
  });
  if (refund) {
    await notifyBuyer({
      buyerId: order.buyerId,
      type: 'REFUND_INITIATED',
      title: refund.processed ? 'Refund credited' : 'Refund initiated',
      message: refund.processed
        ? `₹${order.grandTotal.toLocaleString('en-IN')} has been credited back to the buyer for ${details.orderNumber}. Product: ${details.productSummary}.`
        : `Your refund for order ${order.orderNumber} has been initiated and will be credited by Razorpay after processing.`,
      metadata: { orderId: order._id, paymentId: order.paymentId, refundId: refund.refund?.providerRefundId || null },
    });
  }

  await Notification.create({
    retailerId: req.retailerId,
    type: 'ORDER_CANCELLED',
    title: 'Order Cancelled',
    message: `Order #${order.orderNumber} was cancelled.`,
    metadata: { orderId: order._id },
  });

  return sendSuccess(res, refund?.processed ? 'Order cancelled and refund processed.' : 'Order cancelled. Any applicable refund is being processed.', { order });
});

export const returnOrder = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = await Order.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!order) {
    return sendError(res, 'Order not found.', null, 404);
  }

  if (order.orderStatus === 'RETURNED' || order.returnRequest?.status === 'REFUNDED') {
    return sendSuccess(res, 'Return was already processed.', { order });
  }
  if (order.orderStatus !== 'DELIVERED' || order.returnRequest?.status !== 'APPROVED') return sendError(res, 'Only seller-approved delivered returns can be received.', null, 400);

  const refund = await requestMarketplaceRefund({ order, reason: order.returnRequest.reason });
  logger.info('Return refund function returned', {
    source: 'src/controllers/order.controller.js:481',
    orderId: String(order._id),
    refundAmount: refund?.refund?.amount || 0,
    refundStatus: refund?.refund?.status || 'NOT_REQUESTED',
    providerRefundId: refund?.refund?.providerRefundId || null,
  });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await Order.findById(order._id).session(session);
      for (const item of current.items) await updateStockQuantity({ retailerId: req.retailerId, productId: item.productId, changeQuantity: item.quantity, reason: `Return processed for Order #${current.orderNumber}`, type: 'RETURN', createdBy: req.retailerId, session });
      current.orderStatus = 'RETURNED';
      current.returnRequest.status = refund?.processed ? 'REFUNDED' : 'RECEIVED';
      current.returnRequest.receivedAt = new Date();
      if (refund?.processed) { current.paymentStatus = 'REFUNDED'; await reverseSellerLedgerForRefund({ order: current, paymentId: current.paymentId, session }); }
      current.timeline.push({ status: 'RETURNED', comment: refund?.processed ? 'Customer return received and refund processed.' : 'Customer return received; refund is being processed.', timestamp: new Date() });
      await current.save({ session });
      Object.assign(order, current.toObject());
    });
  } finally {
    await session.endSession();
  }

  await Notification.create({
    retailerId: req.retailerId,
    type: 'RETURN_REQUEST',
    title: 'Order Returned',
    message: `Order #${order.orderNumber} returned and stock restored to inventory.`,
    metadata: { orderId: order._id },
  });

  return sendSuccess(res, 'Order returned and stock restored to inventory.', { order });
});

export const decideReturnRequest = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, retailerId: req.retailerId, isDeleted: false });
  if (!order) return sendError(res, 'Order not found.', null, 404);
  if (order.returnRequest?.status !== 'REQUESTED') return sendError(res, 'There is no pending return request for this order.', null, 400);
  order.returnRequest.status = req.body.decision;
  order.returnRequest.sellerNote = req.body.note;
  order.returnRequest.decisionAt = new Date();
  order.timeline.push({ status: `RETURN_${req.body.decision}`, comment: req.body.note || `Seller ${req.body.decision.toLowerCase()} the return request.` });
  await order.save();
  return sendSuccess(res, `Return request ${req.body.decision.toLowerCase()}.`, { order });
});
