import { connectDB } from '../config/db.js';
import { Product } from '../models/product.model.js';
import { Category } from '../models/category.model.js';
import { GlobalCategory } from '../models/globalCategory.model.js';

const aliases = new Map([['mobile', 'mobiles-smartphones'], ['mobiles', 'mobiles-smartphones'], ['smartphone', 'mobiles-smartphones'], ['phone', 'mobiles-smartphones'], ['tv', 'tvs-smart-tvs'], ['television', 'tvs-smart-tvs'], ['smart tv', 'tvs-smart-tvs'], ['ac', 'air-conditioners-split-acs'], ['air conditioner', 'air-conditioners-split-acs'], ['refrigerator', 'refrigerators-double-door-refrigerators'], ['fridge', 'refrigerators-double-door-refrigerators'], ['laptop', 'laptops-business-laptops'], ['washing machine', 'washing-machines-front-load-washing-machines'], ['audio', 'audio-headphones'], ['headphone', 'audio-headphones'], ['earbuds', 'audio-earbuds'], ['speaker', 'audio-speakers']]);
await connectDB();
const globalCategories = await GlobalCategory.find({ isActive: true, isLeaf: true }).select('_id slug').lean();
const bySlug = new Map(globalCategories.map((category) => [category.slug, category]));
const legacyCategories = await Category.find({ isDeleted: false }).select('_id name').lean();
const legacyNames = new Map(legacyCategories.map((category) => [String(category._id), category.name]));
const products = await Product.find({ isDeleted: false, globalCategoryId: null }).select('_id name brand category').lean();
let migrated = 0; let unresolved = 0;
for (const product of products) {
  const source = `${legacyNames.get(String(product.category)) || ''} ${product.name} ${product.brand || ''}`.toLowerCase();
  const match = [...aliases.entries()].find(([term]) => source.includes(term));
  const category = match ? bySlug.get(match[1]) : null;
  if (!category) { unresolved += 1; continue; }
  await Product.updateOne({ _id: product._id }, { $set: { globalCategoryId: category._id } }); migrated += 1;
}
console.log(`Migration complete. Categorized: ${migrated}; needs manual category review: ${unresolved}.`);
process.exit(0);
