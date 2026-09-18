import mongoose from 'mongoose';

const merchandisingBannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    subtitle: { type: String, trim: true, default: '', maxlength: 240 },
    ctaLabel: { type: String, trim: true, default: 'Shop now', maxlength: 40 },
    ctaHref: { type: String, trim: true, default: '/c/mobiles', maxlength: 200 },
    imageUrl: { type: String, trim: true, default: '' },
    position: { type: Number, default: 1, min: 1, max: 99 },
    isActive: { type: Boolean, default: true, index: true },
    createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin', default: null },
  },
  { timestamps: true }
);

merchandisingBannerSchema.index({ isActive: 1, position: 1 });

export const MerchandisingBanner = mongoose.model('MerchandisingBanner', merchandisingBannerSchema);
