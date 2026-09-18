import { Notification } from '../models/notification.model.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, formatPaginationMeta } from '../utils/pagination.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

export const getNotifications = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { unreadOnly } = req.query;

  const filter = { retailerId: req.retailerId };
  if (unreadOnly === 'true') {
    filter.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  const paginationMeta = formatPaginationMeta(total, page, limit);

  return sendSuccess(res, 'Notifications fetched successfully.', { notifications }, 200, paginationMeta);
});

export const getUnreadCount = asyncWrapper(async (req, res) => {
  const count = await Notification.countDocuments({
    retailerId: req.retailerId,
    isRead: false,
  });

  return sendSuccess(res, 'Unread notification count fetched.', { unreadCount: count });
});

export const markAsRead = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, retailerId: req.retailerId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return sendError(res, 'Notification not found.', null, 404);
  }

  return sendSuccess(res, 'Notification marked as read.', { notification });
});

export const markAllAsRead = asyncWrapper(async (req, res) => {
  await Notification.updateMany(
    { retailerId: req.retailerId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return sendSuccess(res, 'All notifications marked as read.');
});
