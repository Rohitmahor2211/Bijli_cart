import { Category } from '../models/category.model.js';
import { uploadImage, deleteImage } from '../services/cloudinary.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getPublicCategories = asyncWrapper(async (req, res) => {
  const categories = await Category.find({
    isDeleted: false,
    isActive: true,
  }).sort({ name: 1 });
  return sendSuccess(res, 'Public categories fetched.', { categories });
});

export const createCategory = asyncWrapper(async (req, res) => {
  const { name, description, parentCategory, isActive } = req.body;

  const slug = generateSlug(name);
  const existingCategory = await Category.findOne({
    retailerId: req.retailerId,
    slug,
    isDeleted: false,
  });

  if (existingCategory) {
    return sendError(res, `Category with name '${name}' already exists.`, null, 409);
  }

  if (parentCategory) {
    const parentExists = await Category.findOne({
      _id: parentCategory,
      retailerId: req.retailerId,
      isDeleted: false,
    });
    if (!parentExists) {
      return sendError(res, 'Parent category does not exist.', null, 400);
    }
  }

  const category = new Category({
    retailerId: req.retailerId,
    name,
    slug,
    description: description || '',
    parentCategory: parentCategory || null,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  if (req.file) {
    const folder = `retailer/categories/${category._id}`;
    const uploaded = await uploadImage(req.file.buffer, folder);
    category.image = { url: uploaded.url, publicId: uploaded.publicId };
  }

  await category.save();
  return sendSuccess(res, 'Category created successfully.', { category }, 201);
});

export const getCategories = asyncWrapper(async (req, res) => {
  const { flat, activeOnly } = req.query;

  const filter = {
    retailerId: req.retailerId,
    isDeleted: false,
  };

  if (activeOnly === 'true') {
    filter.isActive = true;
  }

  if (flat === 'true') {
    const categories = await Category.find(filter)
      .populate('parentCategory', 'name slug')
      .sort({ name: 1 });
    return sendSuccess(res, 'Flat list of categories fetched.', { categories });
  }

  // Hierarchical list (parent categories with subcategories)
  const parents = await Category.find({ ...filter, parentCategory: null }).sort({ name: 1 });
  const parentIds = parents.map((p) => p._id);
  const subcategories = await Category.find({ ...filter, parentCategory: { $in: parentIds } }).sort({ name: 1 });

  const result = parents.map((parent) => {
    const subs = subcategories.filter(
      (sub) => sub.parentCategory.toString() === parent._id.toString()
    );
    return {
      ...parent.toObject(),
      subcategories: subs,
    };
  });

  return sendSuccess(res, 'Hierarchical categories fetched.', { categories: result });
});

export const getCategoryById = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  }).populate('parentCategory', 'name slug');

  if (!category) {
    return sendError(res, 'Category not found.', null, 404);
  }

  // Get subcategories if any
  const subcategories = await Category.find({
    parentCategory: category._id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  return sendSuccess(res, 'Category details fetched.', { category, subcategories });
});

export const updateCategory = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { name, description, parentCategory, isActive } = req.body;

  const category = await Category.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!category) {
    return sendError(res, 'Category not found.', null, 404);
  }

  if (name) {
    category.name = name;
    category.slug = generateSlug(name);
  }
  if (description !== undefined) category.description = description;
  if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
  if (isActive !== undefined) category.isActive = Boolean(isActive);

  if (req.file) {
    if (category.image && category.image.publicId) {
      await deleteImage(category.image.publicId);
    }
    const folder = `retailer/categories/${category._id}`;
    const uploaded = await uploadImage(req.file.buffer, folder);
    category.image = { url: uploaded.url, publicId: uploaded.publicId };
  }

  await category.save();
  return sendSuccess(res, 'Category updated successfully.', { category });
});

export const deleteCategory = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!category) {
    return sendError(res, 'Category not found.', null, 404);
  }

  // Soft delete category
  category.isDeleted = true;
  category.isActive = false;
  await category.save();

  // Also soft delete subcategories
  await Category.updateMany(
    { parentCategory: category._id, retailerId: req.retailerId },
    { $set: { isDeleted: true, isActive: false } }
  );

  return sendSuccess(res, 'Category and subcategories soft deleted successfully.');
});
