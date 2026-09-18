import { GlobalCategory } from '../models/globalCategory.model.js';
import { Product } from '../models/product.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import { getPaginationParams, formatPaginationMeta } from '../utils/pagination.js';
import { applyCategoryProductFilters, buildCategoryFacets, getApprovedSellerIds, resolveSearchCategorySlug } from '../services/catalogFilters.service.js';

const buyerVisibleProductFilter = async () => {
  const approvedSellerIds = await getApprovedSellerIds();
  return {
    isDeleted: false,
    status: 'ACTIVE',
    retailerId: { $in: approvedSellerIds },
  };
};

export const getCatalogNavigation = asyncWrapper(async (req, res) => {
  const categories = await GlobalCategory.find({ isActive: true, 'navigation.showInHeader': true }).sort({ 'navigation.headerPosition': 1, name: 1 }).lean();
  return sendSuccess(res, 'Marketplace navigation fetched.', { categories });
});

export const getSellerCatalogCategories = asyncWrapper(async (req, res) => {
  const categories = await GlobalCategory.find({ isActive: true, isLeaf: true }).sort({ name: 1 }).lean();
  return sendSuccess(res, 'Seller marketplace categories fetched.', { categories });
});

export const getCatalogCategory = asyncWrapper(async (req, res) => {
  const category = await GlobalCategory.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!category) return sendError(res, 'Marketplace category not found.', null, 404);
  const children = await GlobalCategory.find({ parentId: category._id, isActive: true }).sort({ name: 1 }).lean();
  return sendSuccess(res, 'Marketplace category fetched.', { category, children });
});

export const getCatalogCategoryProducts = asyncWrapper(async (req, res) => {
  const category = await GlobalCategory.findOne({ slug: req.params.slug, isActive: true });
  if (!category) return sendError(res, 'Marketplace category not found.', null, 404);
  const descendants = await GlobalCategory.find({ $or: [{ _id: category._id }, { path: category._id }], isActive: true }).select('_id');
  const { page, limit, skip } = getPaginationParams(req.query);
  const visibilityFilter = await buyerVisibleProductFilter();
  const baseFilter = {
    ...visibilityFilter,
    globalCategoryId: { $in: descendants.map((item) => item._id) },
  };
  const filter = { ...baseFilter };
  const appliedFilters = applyCategoryProductFilters(filter, req.query, category);

  let sortOption = { createdAt: -1 };
  if (req.query.sort === 'price_asc') sortOption = { 'pricing.sellingPrice': 1 };
  if (req.query.sort === 'price_desc') sortOption = { 'pricing.sellingPrice': -1 };

  const [products, total, filters] = await Promise.all([
    Product.find(filter).populate('globalCategoryId', 'name slug').sort(sortOption).skip(skip).limit(limit),
    Product.countDocuments(filter),
    buildCategoryFacets(Product, baseFilter, category),
  ]);

  return sendSuccess(
    res,
    'Marketplace category products fetched.',
    { category, products, filters, appliedFilters },
    200,
    formatPaginationMeta(total, page, limit)
  );
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchCatalog = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const visibilityFilter = await buyerVisibleProductFilter();
  const filter = { ...visibilityFilter };
  let category = null;
  const categorySlug = resolveSearchCategorySlug(req.query.category);
  if (categorySlug) {
    category = await GlobalCategory.findOne({ slug: categorySlug, isActive: true });
    if (!category) return sendError(res, 'Marketplace category not found.', null, 404);
    const descendants = await GlobalCategory.find({ $or: [{ _id: category._id }, { path: category._id }], isActive: true }).select('_id');
    filter.globalCategoryId = { $in: descendants.map((item) => item._id) };
    applyCategoryProductFilters(filter, req.query, category);
  }

  const queryText = String(req.query.q || '').trim();
  if (queryText) {
    const searchRegex = new RegExp(escapeRegex(queryText), 'i');
    filter.$or = [{ name: searchRegex }, { brand: searchRegex }, { description: searchRegex }, { modelNumber: searchRegex }];
  }

  let sortOption = { createdAt: -1 };
  if (req.query.sort === 'price_asc') sortOption = { 'pricing.sellingPrice': 1 };
  if (req.query.sort === 'price_desc') sortOption = { 'pricing.sellingPrice': -1 };

  const [products, total] = await Promise.all([
    Product.find(filter).populate('globalCategoryId', 'name slug').sort(sortOption).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    'Catalog search results fetched.',
    { products, category, query: queryText },
    200,
    formatPaginationMeta(total, page, limit)
  );
});
