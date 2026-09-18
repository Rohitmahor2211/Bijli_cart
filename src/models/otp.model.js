import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['LOGIN', 'VERIFICATION', 'PASSWORD_RESET'],
      default: 'LOGIN',
    },
    audience: {
      type: String,
      enum: ['RETAILER', 'BUYER', 'PLATFORM_ADMIN'],
      default: 'RETAILER',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Auto expire TTL index
    },
    attempts: {
      type: Number,
      default: 0,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ phone: 1, purpose: 1, audience: 1 });

export const OTP = mongoose.model('OTP', otpSchema);
