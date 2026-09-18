import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Retailer',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['NEW_ORDER', 'PAYMENT_RECEIVED', 'LOW_STOCK', 'OUT_OF_STOCK', 'ORDER_CANCELLED', 'RETURN_REQUEST', 'ORDER_ACCEPTED', 'ORDER_DELIVERED', 'SELLER_PAYMENT_COMPLETED', 'SYSTEM'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ retailerId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
