import { SupportTicket } from '../models/supportTicket.model.js';
import { Order } from '../models/order.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

export const createBuyerTicket = asyncWrapper(async (req, res) => {
  let retailerId = null;
  if (req.body.orderId) {
    const order = await Order.findOne({ _id: req.body.orderId, isDeleted: false, buyerId: req.buyer._id });
    if (!order) return sendError(res, 'Order not found for this customer account.', null, 404);
    retailerId = order.retailerId;
  }
  const ticket = await SupportTicket.create({
    ticketNumber: `TCK-${Date.now()}`,
    type: req.body.type || 'SUPPORT',
    subject: req.body.subject,
    description: req.body.description,
    buyerId: req.buyer._id,
    orderId: req.body.orderId || null,
    retailerId,
  });
  return sendSuccess(res, 'Support ticket created.', { ticket }, 201);
});

export const listBuyerTickets = asyncWrapper(async (req, res) => {
  const tickets = await SupportTicket.find({ buyerId: req.buyer._id }).populate('orderId', 'orderNumber orderStatus').sort({ createdAt: -1 });
  return sendSuccess(res, 'Support tickets fetched.', { tickets });
});
