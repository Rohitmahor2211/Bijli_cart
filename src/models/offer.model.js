import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Retailer',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Offer name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Offer promo code is required'],
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED', 'PRODUCT', 'CATEGORY'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    minimumOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maximumDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

offerSchema.index({ retailerId: 1, code: 1, isDeleted: 1 }, { unique: true });

export const Offer = mongoose.model('Offer', offerSchema);
