import mongoose from 'mongoose';

const platformAdminNotificationSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin', required: true, index: true },
    type: {
      type: String,
      enum: ['PAYMENT_RECEIVED', 'ORDER_ACCEPTED', 'ORDER_CANCELLED', 'BUYER_CANCELLED', 'SYSTEM'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

platformAdminNotificationSchema.index({ adminId: 1, isRead: 1, createdAt: -1 });

export const PlatformAdminNotification = mongoose.model(
  'PlatformAdminNotification',
  platformAdminNotificationSchema,
);
