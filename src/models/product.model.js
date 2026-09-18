import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: false, default: '' },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Retailer',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    modelNumber: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    // Global marketplace category is the buyer-facing source of truth.
    globalCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalCategory', default: null, index: true },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    highlights: { type: [String], default: [] },
    pricing: {
      mrp: { type: Number, required: true, min: 0 },
      sellingPrice: { type: Number, required: true, min: 0 },
      purchasePrice: { type: Number, default: 0, min: 0 },
      discount: { type: Number, default: 0, min: 0 }, // Discount amount or %
      tax: { type: Number, default: 0, min: 0, max: 100 }, // Tax percentage (e.g., 18 for 18% GST)
    },
    inventory: {
      // Deprecated compatibility snapshot. Inventory.currentStock is canonical.
      stockQuantity: { type: Number, required: true, min: 0, default: 0 },
      lowStockThreshold: { type: Number, default: 5, min: 0 },
    },
    logistics: {
      weightKg: { type: Number, required: true, min: 0.05, default: 0.5 },
      lengthCm: { type: Number, required: true, min: 1, default: 20 },
      breadthCm: { type: Number, required: true, min: 1, default: 15 },
      heightCm: { type: Number, required: true, min: 1, default: 10 },
    },
    warranty: {
      available: { type: Boolean, default: false },
      duration: { type: String, default: '' }, // e.g. "1 Year Manufacturer Warranty"
      description: { type: String, default: '' },
    },
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    images: {
      type: [productImageSchema],
      validate: [
        function (val) {
          return val.length <= 10;
        },
        'Product cannot have more than 10 images',
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    submittedForReviewAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Retailer',
    },
  },
  {
    timestamps: true,
    toJSON: { flattenMaps: true },
    toObject: { flattenMaps: true },
  }
);

productSchema.index({ retailerId: 1, sku: 1, isDeleted: 1 }, { unique: true });
productSchema.index({ retailerId: 1, category: 1, isDeleted: 1 });
productSchema.index({ retailerId: 1, status: 1, isDeleted: 1 });
productSchema.index({ retailerId: 1, createdAt: -1 });
productSchema.index({ globalCategoryId: 1, status: 1, isDeleted: 1, 'pricing.sellingPrice': 1 });
productSchema.index({ status: 1, isDeleted: 1, retailerId: 1 });
productSchema.index({ name: 'text', brand: 'text', description: 'text', modelNumber: 'text' });
productSchema.index({ brand: 1, status: 1, isDeleted: 1 });
productSchema.pre('validate', function () {
  if (this.pricing?.sellingPrice > this.pricing?.mrp) throw new Error('Selling price cannot exceed MRP.');
  if (this.pricing?.discount > 100) throw new Error('Discount must be between 0 and 100.');
});

export const Product = mongoose.model('Product', productSchema);
