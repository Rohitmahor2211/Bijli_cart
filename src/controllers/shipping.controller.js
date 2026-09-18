import { Order } from '../models/order.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import { checkServiceability, createReturnPickup, createShipment, trackShipment } from '../services/shipping.service.js';
import { notifyBuyer } from '../services/notification.service.js';

export const checkOrderServiceability = asyncWrapper(async (req, res) => {
  const result = await checkServiceability({ pickupPincode: req.retailer.pincode, deliveryPincode: req.query.pincode });
  return sendSuccess(res, result.serviceable ? 'Delivery is available.' : 'Delivery is unavailable for this PIN code.', { serviceability: result });
});
export const createOrderShipment = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, retailerId: req.retailerId, orderStatus: 'PROCESSING', isDeleted: false });
  if (!order) return sendError(res, 'Only processing orders can be shipped.', null, 400);
  if (order.shipment?.trackingNumber) return sendError(res, 'A shipment already exists for this order.', null, 409);
  const shipment = await createShipment({ order, retailer: req.retailer });
  order.shipment = shipment; order.orderStatus = 'SHIPPED'; order.timeline.push({ status: 'SHIPPED', comment: `Shipment created with ${shipment.carrier}. AWB: ${shipment.trackingNumber}` }); await order.save();
  await notifyBuyer({ buyerId: order.buyerId, type: 'ORDER_SHIPPED', title: 'Your order has shipped', message: `${order.orderNumber} is on the way with ${shipment.carrier}.`, metadata: { orderId: order._id, trackingNumber: shipment.trackingNumber } });
  return sendSuccess(res, 'Shipment, AWB, label, and pickup were created.', { order });
});
export const syncOrderTracking = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, retailerId: req.retailerId, isDeleted: false });
  if (!order?.shipment?.trackingNumber) return sendError(res, 'Shipment tracking is not available.', null, 404);
  const tracking = await trackShipment(order.shipment);
  if (tracking.status !== order.orderStatus && ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(tracking.status)) { order.orderStatus = tracking.status; if (tracking.status === 'DELIVERED') order.shipment.deliveredAt = new Date(); order.timeline.push({ status: tracking.status, comment: 'Status updated from courier tracking.' }); await order.save(); }
  return sendSuccess(res, 'Tracking refreshed.', { order, tracking });
});
export const scheduleReturnPickup = asyncWrapper(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, retailerId: req.retailerId, isDeleted: false });
  if (!order || order.returnRequest?.status !== 'APPROVED') return sendError(res, 'Only approved returns can receive a pickup.', null, 400);
  if (order.returnShipment?.trackingNumber) return sendError(res, 'Return pickup already exists.', null, 409);
  order.returnShipment = await createReturnPickup({ order }); order.timeline.push({ status: 'RETURN_PICKUP_SCHEDULED', comment: `Return pickup scheduled. AWB: ${order.returnShipment.trackingNumber}` }); await order.save();
  return sendSuccess(res, 'Return pickup scheduled.', { order });
});
