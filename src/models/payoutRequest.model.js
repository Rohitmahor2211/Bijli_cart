import mongoose from 'mongoose';

const payoutRequestSchema = new mongoose.Schema({
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'INR', uppercase: true },
  status: { type: String, enum: ['PROCESSING', 'PAID', 'FAILED'], default: 'PROCESSING', index: true },
  ledgerEntryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SellerLedger', required: true }],
  transferReference: { type: String, default: '', trim: true },
  failureReason: { type: String, default: '', trim: true },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: null },
}, { timestamps: true });

payoutRequestSchema.index({ retailerId: 1, createdAt: -1 });
export const PayoutRequest = mongoose.model('PayoutRequest', payoutRequestSchema);
