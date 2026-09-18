import mongoose from 'mongoose';

const specificationDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ['text', 'number', 'select', 'boolean'], default: 'text' },
    required: { type: Boolean, default: true },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const globalCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalCategory', default: null, index: true },
  path: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GlobalCategory' }],
  level: { type: Number, required: true, min: 0, default: 0 },
  isLeaf: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true, index: true },
  commissionPercent: { type: Number, min: 0, max: 100, default: null },
  // Seller-facing specification definitions are owned by the platform category.
  // Keep filterSchema as a compatibility alias for older catalog integrations.
  specificationDefinitions: { type: [specificationDefinitionSchema], default: [] },
  filterSchema: { type: [specificationDefinitionSchema], default: [] },
  navigation: {
    showInHeader: { type: Boolean, default: false },
    headerPosition: { type: Number, default: 999 },
    showOnHome: { type: Boolean, default: false },
  },
  seo: { title: { type: String, default: '' }, description: { type: String, default: '' } },
}, { timestamps: true });

globalCategorySchema.index({ parentId: 1, isActive: 1, 'navigation.headerPosition': 1 });

export const GlobalCategory = mongoose.model('GlobalCategory', globalCategorySchema);
