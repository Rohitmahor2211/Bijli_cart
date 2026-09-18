import mongoose from 'mongoose';

const featuredBrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    position: { type: Number, default: 1, min: 1, max: 99 },
    isActive: { type: Boolean, default: true, index: true },
    createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin', default: null },
  },
  { timestamps: true }
);

featuredBrandSchema.index({ isActive: 1, position: 1 });

export const FeaturedBrand = mongoose.model('FeaturedBrand', featuredBrandSchema);
