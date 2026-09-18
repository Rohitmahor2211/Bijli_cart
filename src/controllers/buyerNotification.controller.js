import { BuyerNotification } from '../models/buyerNotification.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

export const getBuyerNotifications = asyncWrapper(async (req, res) => {
  const notifications = await BuyerNotification.find({ buyerId: req.buyer._id }).sort({ createdAt: -1 }).limit(50);
  return sendSuccess(res, 'Customer notifications fetched.', { notifications });
});
export const getBuyerUnreadCount = asyncWrapper(async (req, res) => sendSuccess(res, 'Customer unread count fetched.', { unreadCount: await BuyerNotification.countDocuments({ buyerId: req.buyer._id, isRead: false }) }));
export const markBuyerNotificationRead = asyncWrapper(async (req, res) => { const notification = await BuyerNotification.findOneAndUpdate({ _id: req.params.id, buyerId: req.buyer._id }, { isRead: true, readAt: new Date() }, { returnDocument: 'after' }); if (!notification) return sendError(res, 'Notification not found.', null, 404); return sendSuccess(res, 'Notification marked as read.', { notification }); });
