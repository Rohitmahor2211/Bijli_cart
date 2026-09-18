import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    checkoutReference: { type: String, required: true, unique: true, index: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true, index: true },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }],
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    provider: { type: String, enum: ['MOCK', 'RAZORPAY'], required: true },
    status: {
      type: String,
      enum: ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
      default: 'CREATED',
      index: true,
    },
    providerOrderId: { type: String, default: '', index: true },
    providerPaymentId: { type: String, default: '', index: true },
    providerSignature: { type: String, default: '', select: false },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    capturedAt: { type: Date, default: null },
    failureReason: { type: String, default: '' },
    refunds: [{
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
      amount: { type: Number, required: true, min: 0 },
      providerRefundId: { type: String, default: '' },
      status: { type: String, enum: ['REQUESTED', 'PROCESSED', 'FAILED'], default: 'REQUESTED' },
      reason: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
    }],
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

paymentSchema.index({ buyerId: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
