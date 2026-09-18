import { PlatformAdminNotification } from '../models/platformAdminNotification.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

export const getPlatformAdminNotifications = asyncWrapper(async (req, res) => {
  const notifications = await PlatformAdminNotification.find({ adminId: req.platformAdmin._id })
    .sort({ createdAt: -1 })
    .limit(30);
  const unreadCount = await PlatformAdminNotification.countDocuments({
    adminId: req.platformAdmin._id,
    isRead: false,
  });
  return sendSuccess(res, 'Platform administrator notifications fetched.', { notifications, unreadCount });
});

export const markPlatformAdminNotificationRead = asyncWrapper(async (req, res) => {
  const notification = await PlatformAdminNotification.findOneAndUpdate(
    { _id: req.params.id, adminId: req.platformAdmin._id },
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!notification) return sendError(res, 'Platform administrator notification not found.', null, 404);
  return sendSuccess(res, 'Platform administrator notification marked as read.', { notification });
});

export const markAllPlatformAdminNotificationsRead = asyncWrapper(async (req, res) => {
  await PlatformAdminNotification.updateMany(
    { adminId: req.platformAdmin._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
  return sendSuccess(res, 'Platform administrator notifications marked as read.');
});
