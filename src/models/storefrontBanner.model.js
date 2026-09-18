import mongoose from 'mongoose';

const storefrontBannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, trim: true, default: '' },
  imageUrl: { type: String, trim: true, default: '' },
  linkPath: { type: String, trim: true, default: '/c/mobiles' },
  position: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true, index: true },
  createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin', default: null },
}, { timestamps: true });

storefrontBannerSchema.index({ isActive: 1, position: 1 });

export const StorefrontBanner = mongoose.model('StorefrontBanner', storefrontBannerSchema);
