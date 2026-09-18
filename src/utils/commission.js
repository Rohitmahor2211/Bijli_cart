import { Product } from '../models/product.model.js';
import { GlobalCategory } from '../models/globalCategory.model.js';
import { env } from '../config/env.js';

export const calculateOrderCommission = async (order) => {
  const productIds = [...new Set(order.items.map((item) => String(item.productId)))];
  const products = await Product.find({ _id: { $in: productIds } }).select('_id globalCategoryId').lean();
  const categoryIds = products.map((product) => product.globalCategoryId).filter(Boolean);
  const categories = await GlobalCategory.find({ _id: { $in: categoryIds } }).select('_id commissionPercent').lean();
  const categoryRates = new Map(categories.map((category) => [String(category._id), category.commissionPercent]));
  const productCategories = new Map(products.map((product) => [String(product._id), String(product.globalCategoryId || '')]));
  const defaultRate = env.PLATFORM_COMMISSION_PERCENT;

  const commission = order.items.reduce((total, item) => {
    const categoryId = productCategories.get(String(item.productId));
    const rate = categoryRates.get(categoryId);
    const percent = rate === null || rate === undefined ? defaultRate : rate;
    return total + (Number(item.subtotal || 0) * percent) / 100;
  }, 0);
  return Number(commission.toFixed(2));
};
