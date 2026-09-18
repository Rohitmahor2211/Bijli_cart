import mongoose from 'mongoose';

const buyerSessionSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true, index: true },
  refreshTokenHash: { type: String, required: true },
  userAgent: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

buyerSessionSchema.index({ buyerId: 1, revokedAt: 1, expiresAt: 1 });
export const BuyerSession = mongoose.model('BuyerSession', buyerSessionSchema);
