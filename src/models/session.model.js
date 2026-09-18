import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Retailer',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    device: { type: String, default: 'Unknown' },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ retailerId: 1, revokedAt: 1 });

export const Session = mongoose.model('Session', sessionSchema);
