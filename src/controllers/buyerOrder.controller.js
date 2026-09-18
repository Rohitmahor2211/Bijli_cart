import { Order } from '../models/order.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import { releaseReservedStock, updateStockQuantity } from '../services/inventory.service.js';
import { requestMarketplaceRefund, reverseSellerLedgerForRefund } from '../services/payment.service.js';
import { getOrderNotificationDetails, notifyBuyer, notifyPlatformAdmins, notifySeller } from '../services/notification.service.js';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const safeOrder = (order) => ({ id: order.id, orderNumber: order.orderNumber, checkoutReference: order.checkoutReference, items: order.items, subtotal: order.subtotal, tax: order.tax, shipping: order.shipping, grandTotal: order.grandTotal, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus, sellerPaymentStatus: order.sellerPaymentStatus, refundStatus: order.refundStatus, cancellation: order.cancellation, refund: order.refund, shippingAddress: order.shippingAddress, returnRequest: order.returnRequest, timeline: order.timeline, createdAt: order.createdAt, retailer: order.retailerId ? { id: order.retailerId.id, shopName: order.retailerId.shopName, address: order.retailerId.address, city: order.retailerId.city, state: order.retailerId.state, pincode: order.retailerId.pincode, gstNumber: order.retailerId.gstNumber } : null });

export const getBuyerOrders = asyncWrapper(async (req, res) => {
  const orders = await Order.find({ buyerId: req.buyer._id, isDeleted: false }).populate('retailerId', 'shopName address city state pincode gstNumber').sort({ createdAt: -1 });
  return sendSuccess(res, 'Customer orders fetched.', { orders: orders.map(safeOrder) });
});

export const getBuyerOrderById = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, buyerId: req.buyer._id, isDeleted: false }).populate('retailerId', 'shopName address city state pincode gstNumber');
  if (!order) return sendError(res, 'Order not found.', null, 404);
  return sendSuccess(res, 'Customer order fetched.', { order: safeOrder(order) });
});

export const cancelBuyerOrder = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, buyerId: req.buyer._id, isDeleted: false });
  if (!order) return sendError(res, 'Order not found.', null, 404);
  if (order.orderStatus === 'CANCELLED') {
    return sendSuccess(res, 'Order was already cancelled.', { order: safeOrder(order) });
  }
  if (!['PENDING', 'CONFIRMED'].includes(order.orderStatus)) return sendError(res, 'Buyer cancellation is available only until the retailer accepts the order.', null, 400);
  const refund = await requestMarketplaceRefund({ order, reason: req.body.reason });
  logger.info('Buyer cancellation refund function returned', {
    source: 'src/controllers/buyerOrder.controller.js:31',
    orderId: String(order._id),
    refundAmount: refund?.refund?.amount || 0,
    refundStatus: refund?.refund?.status || 'NOT_REQUESTED',
    providerRefundId: refund?.refund?.providerRefundId || null,
  });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await Order.findById(order._id).session(session);
      for (const item of current.items) {
        if (current.paymentStatus === 'PAID') {
          await updateStockQuantity({ retailerId: current.retailerId, productId: item.productId, changeQuantity: item.quantity, reason: `Customer cancellation: ${current.orderNumber}`, type: 'RETURN', session });
        } else {
          await releaseReservedStock({ retailerId: current.retailerId, productId: item.productId, quantity: item.quantity, session });
        }
      }
      current.orderStatus = 'CANCELLED';
      current.sellerPaymentStatus = 'CANCELLED';
      current.refundStatus = refund?.processed ? 'COMPLETED' : 'PROCESSING';
      current.cancellation = { cancelledBy: 'BUYER', cancelledById: req.buyer._id, reason: req.body.reason || 'Buyer cancellation', cancelledAt: new Date() };
      current.refund = { amount: current.grandTotal, providerRefundId: refund?.refund?.providerRefundId || '', initiatedAt: new Date(), completedAt: refund?.processed ? new Date() : null };
      current.timeline.push({ status: 'CANCELLED', comment: `Customer cancellation requested: ${req.body.reason}` });
      if (refund?.processed) { current.paymentStatus = 'REFUNDED'; await reverseSellerLedgerForRefund({ order: current, paymentId: current.paymentId, session }); }
      await current.save({ session });
      Object.assign(order, current.toObject());
    });
  } finally {
    await session.endSession();
  }
  await notifySeller({ retailerId: order.retailerId, type: 'ORDER_CANCELLED', title: 'Customer cancelled an order', message: `Customer cancelled ${order.orderNumber}.`, metadata: { orderId: order._id } });
  const details = await getOrderNotificationDetails(order);
  await notifyPlatformAdmins({
    type: 'BUYER_CANCELLED',
    title: 'Buyer cancelled an order',
    message: `Buyer cancelled order ${details.orderNumber}. Seller: ${details.sellerName} (${details.shopName}). Product: ${details.productSummary}. Total: ₹${details.orderTotal.toLocaleString('en-IN')}. Refund: ${refund?.processed ? 'COMPLETED' : 'PROCESSING'}.`,
    metadata: { orderId: order._id, orderNumber: details.orderNumber, sellerName: details.sellerName, shopName: details.shopName, products: details.products, amount: details.orderTotal, refundStatus: refund?.processed ? 'COMPLETED' : 'PROCESSING', badge: 'CANCELLED' },
  });
  await notifyBuyer({
    buyerId: order.buyerId,
    type: 'REFUND_INITIATED',
    title: refund?.processed ? 'Refund credited' : 'Refund initiated',
    message: refund?.processed
      ? `Your refund for ${order.orderNumber} has been credited.`
      : `Your refund for ${order.orderNumber} has been initiated and will be updated after provider processing.`,
    metadata: { orderId: order._id, refundId: refund?.refund?.providerRefundId || null },
  });
  return sendSuccess(res, refund?.processed ? 'Order cancelled and refund processed.' : 'Order cancelled. Refund is being processed.', { order: safeOrder(order) });
});

export const requestBuyerReturn = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, buyerId: req.buyer._id, isDeleted: false });
  if (!order) return sendError(res, 'Order not found.', null, 404);
  if (order.orderStatus !== 'DELIVERED') return sendError(res, 'A return can be requested only after delivery.', null, 400);
  if (order.returnRequest?.status === 'REQUESTED') {
    return sendSuccess(res, 'Return request was already submitted.', { order: safeOrder(order) });
  }
  if (order.returnRequest?.status !== 'NONE') return sendError(res, 'A return request already exists for this order.', null, 409);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      order.returnRequest = { status: 'REQUESTED', reason: req.body.reason, requestedAt: new Date() };
      order.timeline.push({ status: 'RETURN_REQUESTED', comment: `Customer requested a return: ${req.body.reason}` });
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }
  await notifySeller({ retailerId: order.retailerId, type: 'RETURN_REQUEST', title: 'New return request', message: `Customer requested return for ${order.orderNumber}.`, metadata: { orderId: order._id } });
  return sendSuccess(res, 'Return request submitted to the seller.', { order: safeOrder(order) }, 201);
});
