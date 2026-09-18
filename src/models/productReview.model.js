import mongoose from 'mongoose';

const productReviewSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, default: '' },
  comment: { type: String, trim: true, default: '' },
  isVisible: { type: Boolean, default: true },
}, { timestamps: true });

productReviewSchema.index({ productId: 1, buyerId: 1 }, { unique: true });
productReviewSchema.index({ productId: 1, isVisible: 1, createdAt: -1 });

export const ProductReview = mongoose.model('ProductReview', productReviewSchema);
