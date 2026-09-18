import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, enum: ['RAZORPAY'] },
    eventId: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    status: { type: String, enum: ['RECEIVED', 'PROCESSED', 'FAILED'], default: 'RECEIVED' },
    failureReason: { type: String, default: '' },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);
