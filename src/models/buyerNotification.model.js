import mongoose from 'mongoose';

const buyerNotificationSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true, index: true },
  type: { type: String, enum: ['PAYMENT_DEBITED', 'ORDER_CONFIRMED', 'ORDER_ACCEPTED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'REFUND_INITIATED', 'REFUND_UPDATED', 'RETURN_UPDATED', 'SYSTEM'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

buyerNotificationSchema.index({ buyerId: 1, isRead: 1, createdAt: -1 });
export const BuyerNotification = mongoose.model('BuyerNotification', buyerNotificationSchema);
