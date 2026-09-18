import mongoose from 'mongoose';
import { Product } from '../models/product.model.js';
import { Inventory, InventoryHistory } from '../models/inventory.model.js';
import { Category } from '../models/category.model.js';
import { GlobalCategory } from '../models/globalCategory.model.js';
import { uploadImage, deleteImage, deleteImages } from '../services/cloudinary.service.js';
import { getApprovedSellerIds, validateCategorySpecifications } from '../services/catalogFilters.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, formatPaginationMeta } from '../utils/pagination.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { logger } from '../utils/logger.js';

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const valuesEqual = (left, right) => String(left || '').trim() === String(right || '').trim();

const productSkuConflict = async ({ retailerId, sku, excludeId = null }) => {
  const filter = { retailerId, isDeleted: false, sku };
  if (excludeId) filter._id = { $ne: excludeId };
  return Product.findOne(filter).select('_id sku').lean();
};

const buyerVisibleProductFilter = async () => {
  const approvedSellerIds = await getApprovedSellerIds();
  return {
    isDeleted: false,
    status: 'ACTIVE',
    retailerId: { $in: approvedSellerIds },
  };
};

export const getPublicProducts = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { search, category, brand, minPrice, maxPrice, sort } = req.query;

  const filter = await buyerVisibleProductFilter();

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { brand: searchRegex },
    ];
  }

  if (category && category !== 'all') {
    filter.category = category; // Ideally resolve slug to ID, but simple match for now
  }

  if (brand) {
    filter.brand = new RegExp(brand.trim(), 'i');
  }

  if (minPrice || maxPrice) {
    filter['pricing.sellingPrice'] = {};
    if (minPrice) filter['pricing.sellingPrice'].$gte = Number(minPrice);
    if (maxPrice) filter['pricing.sellingPrice'].$lte = Number(maxPrice);
  }

  let sortOption = { createdAt: -1 };
  if (sort === 'price_asc') sortOption = { 'pricing.sellingPrice': 1 };
  if (sort === 'price_desc') sortOption = { 'pricing.sellingPrice': -1 };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  const paginationMeta = formatPaginationMeta(total, page, limit);
  return sendSuccess(res, 'Public products fetched successfully.', { products }, 200, paginationMeta);
});

export const getPublicProductById = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const visibilityFilter = await buyerVisibleProductFilter();
  const product = await Product.findOne({
    $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { slug: id }],
    ...visibilityFilter,
  }).populate('category', 'name slug').populate('retailerId', 'shopName sellerStatus');

  if (!product) {
    return sendError(res, 'Product not found.', null, 404);
  }

  const inventories = await Inventory.find({ retailerId: product.retailerId?._id || product.retailerId, productId: product._id }).lean();
  const inventory = inventories[0];
  if (inventory) product.inventory.stockQuantity = Math.max(0, inventory.currentStock - inventory.reservedStock);
  return sendSuccess(res, 'Product details fetched.', product); // Return product directly as data
});

export const createProduct = asyncWrapper(async (req, res) => {
  const {
    name,
    sku,
    brand,
    modelNumber,
    globalCategoryId,
    subcategory,
    description,
    highlights,
    mrp,
    sellingPrice,
    purchasePrice,
    discount,
    tax,
    stockQuantity,
    lowStockThreshold,
    weightKg, lengthCm, breadthCm, heightCm,
    warrantyAvailable,
    warrantyDuration,
    warrantyDescription,
    specifications,
  } = req.body;
  const baseSku = String(sku || `PRODUCT-${Date.now()}`).trim().toUpperCase();

  const marketplaceCategory = await GlobalCategory.findOne({ _id: globalCategoryId, isActive: true, isLeaf: true });
  if (!marketplaceCategory) return sendError(res, 'Select a valid active marketplace category.', null, 400);
  const specificationError = validateCategorySpecifications(marketplaceCategory, specifications);
  if (specificationError) return sendError(res, specificationError, null, 400);

  const existingSku = await productSkuConflict({ retailerId: req.retailerId, sku: baseSku });
  if (existingSku) {
    return sendError(res, `A product with SKU '${sku}' already exists in your catalog.`, null, 409);
  }

  const slug = `${generateSlug(name)}-${Date.now()}`;

  const product = new Product({
    retailerId: req.retailerId,
    name,
    slug,
    sku: baseSku,
    brand: brand || '',
    modelNumber: modelNumber || '',
    globalCategoryId,
    subcategory: subcategory || null,
    description: description || '',
    pricing: {
      mrp: Number(mrp ?? 0),
      sellingPrice: Number(sellingPrice ?? 0),
      purchasePrice: Number(purchasePrice || 0),
      discount: Number(discount || 0),
      tax: Number(tax || 0),
    },
    inventory: {
      stockQuantity: Number(stockQuantity || 0),
      lowStockThreshold: Number(lowStockThreshold || 5),
    },
    logistics: { weightKg: Number(weightKg), lengthCm: Number(lengthCm), breadthCm: Number(breadthCm), heightCm: Number(heightCm) },
    warranty: {
      available: Boolean(warrantyAvailable),
      duration: warrantyDuration || '',
      description: warrantyDescription || '',
    },
    highlights: highlights || [],
    specifications: specifications || {},
    status: 'PENDING_REVIEW',
    rejectionReason: '',
    submittedForReviewAt: new Date(),
    createdBy: req.retailerId,
  });

  // Upload images if attached via Multer
  if (req.files && req.files.length > 0) {
    if (req.files.length > 10) {
      return sendError(res, 'Maximum 10 images can be uploaded per product.', null, 400);
    }

    const folder = `retailer/products/${product._id}`;
    const uploadedImages = [];

    try {
      const uploadResults = await Promise.allSettled(req.files.map((file) => uploadImage(file.buffer, folder)));
      const failedUpload = uploadResults.find((result) => result.status === 'rejected');
      const results = uploadResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      results.forEach((result, index) => {
        uploadedImages.push({
          url: result.url,
          publicId: result.publicId,
          isPrimary: index === 0,
          sortOrder: index,
        });
      });
      if (failedUpload) throw failedUpload.reason;
      product.images = uploadedImages;
    } catch (uploadErr) {
      // Clean up any uploaded images if creation failed midway
      if (uploadedImages.length > 0) {
        await deleteImages(uploadedImages.map((img) => img.publicId));
      }
      throw uploadErr;
    }
  }

  await product.save();

  // Create corresponding Inventory document
  const initialStock = Number(stockQuantity || 0);
  const threshold = Number(lowStockThreshold || 5);
  await Inventory.create({
    retailerId: req.retailerId,
    productId: product._id,
    currentStock: initialStock,
    reservedStock: 0,
    lowStockThreshold: threshold,
  });

  if (initialStock > 0) {
    await InventoryHistory.create({
      retailerId: req.retailerId,
      productId: product._id,
      previousQuantity: 0,
      changeQuantity: initialStock,
      newQuantity: initialStock,
      reason: 'Initial Product Stock Setup',
      type: 'PURCHASE',
      createdBy: req.retailerId,
    });
  }

  logger.info(`Product created: ${product.name} (SKU: ${product.sku})`);

  return sendSuccess(res, 'Product created successfully.', { product }, 201);
});

export const getProducts = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { search, category, subcategory, brand, minPrice, maxPrice, stockStatus, status, sort } = req.query;

  const filter = {
    retailerId: req.retailerId,
    isDeleted: false,
  };

  // Text search on name, sku, brand, modelNumber
  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { sku: searchRegex },
      { brand: searchRegex },
      { modelNumber: searchRegex },
    ];
  }

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    } else {
      const catObj = await Category.findOne({ retailerId: req.retailerId, slug: category });
      if (catObj) filter.category = catObj._id;
    }
  }

  if (subcategory) {
    if (mongoose.Types.ObjectId.isValid(subcategory)) {
      filter.subcategory = subcategory;
    } else {
      const subCatObj = await Category.findOne({ retailerId: req.retailerId, slug: subcategory });
      if (subCatObj) filter.subcategory = subCatObj._id;
    }
  }

  if (brand) {
    filter.brand = new RegExp(brand.trim(), 'i');
  }

  if (status) {
    filter.status = status;
  }

  if (minPrice || maxPrice) {
    filter['pricing.sellingPrice'] = {};
    if (minPrice) filter['pricing.sellingPrice'].$gte = Number(minPrice);
    if (maxPrice) filter['pricing.sellingPrice'].$lte = Number(maxPrice);
  }

  if (stockStatus) {
    const inventoryFilter = stockStatus === 'OUT_OF_STOCK'
      ? { $expr: { $lte: [{ $subtract: ['$currentStock', '$reservedStock'] }, 0] } }
      : stockStatus === 'LOW_STOCK'
        ? { $expr: { $and: [{ $gt: [{ $subtract: ['$currentStock', '$reservedStock'] }, 0] }, { $lte: [{ $subtract: ['$currentStock', '$reservedStock'] }, '$lowStockThreshold'] }] } }
        : { $expr: { $gt: [{ $subtract: ['$currentStock', '$reservedStock'] }, 0] } };
    const matchingInventory = await Inventory.find({ retailerId: req.retailerId, ...inventoryFilter }).select('productId').lean();
    filter._id = { $in: matchingInventory.map((entry) => entry.productId) };
  }

  // Sorting logic
  let sortOption = { createdAt: -1 };
  if (sort === 'price_asc') sortOption = { 'pricing.sellingPrice': 1 };
  if (sort === 'price_desc') sortOption = { 'pricing.sellingPrice': -1 };
  if (sort === 'created_asc') sortOption = { createdAt: 1 };
  if (sort === 'name_asc') sortOption = { name: 1 };
  if (sort === 'name_desc') sortOption = { name: -1 };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .populate('globalCategoryId', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  const paginationMeta = formatPaginationMeta(total, page, limit);

  return sendSuccess(res, 'Products fetched successfully.', { products }, 200, paginationMeta);
});

export const getProductById = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  })
    .populate('category', 'name slug description')
    .populate('subcategory', 'name slug')
    .populate('globalCategoryId', 'name slug');

  if (!product) {
    return sendError(res, 'Product not found.', null, 404);
  }

  const inventories = await Inventory.find({
    retailerId: req.retailerId,
    productId: product._id,
  });

  return sendSuccess(res, 'Product details fetched.', {
    product,
    inventory: inventories[0] || null,
  });
});

export const updateProduct = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!product) {
    return sendError(res, 'Product not found.', null, 404);
  }

  const body = req.body;
  if (body.sku && body.sku.toUpperCase() !== product.sku) {
    const existingSku = await productSkuConflict({
      retailerId: req.retailerId,
      sku: body.sku.toUpperCase(),
      excludeId: product._id,
    });
    if (existingSku) {
      return sendError(res, `SKU '${body.sku}' is already in use by another product.`, null, 409);
    }
    product.sku = body.sku.toUpperCase();
  }

  if (body.name !== undefined && !valuesEqual(body.name, product.name)) {
    product.name = body.name;
    product.slug = `${generateSlug(body.name)}-${Date.now()}`;
  }

  if (body.brand !== undefined) product.brand = body.brand;
  if (body.modelNumber !== undefined) product.modelNumber = body.modelNumber;
  if (body.category) product.category = body.category;
  if (body.globalCategoryId !== undefined) {
    const marketplaceCategory = await GlobalCategory.findOne({ _id: body.globalCategoryId, isActive: true, isLeaf: true });
    if (!marketplaceCategory) return sendError(res, 'Select a valid active marketplace category.', null, 400);
    product.globalCategoryId = body.globalCategoryId;
  }
  if (body.subcategory !== undefined) product.subcategory = body.subcategory;
  if (body.description !== undefined) product.description = body.description;
  if (body.highlights !== undefined) product.highlights = body.highlights;
  if (body.mrp !== undefined) product.pricing.mrp = Number(body.mrp);
  if (body.sellingPrice !== undefined) product.pricing.sellingPrice = Number(body.sellingPrice);
  if (body.purchasePrice !== undefined) product.pricing.purchasePrice = Number(body.purchasePrice);
  if (body.discount !== undefined) product.pricing.discount = Number(body.discount);
  if (body.tax !== undefined) product.pricing.tax = Number(body.tax);

  if (body.lowStockThreshold !== undefined) {
    product.inventory.lowStockThreshold = Number(body.lowStockThreshold);
    await Inventory.updateOne(
      { retailerId: req.retailerId, productId: product._id },
      { lowStockThreshold: Number(body.lowStockThreshold) }
    );
  }
  if (body.weightKg !== undefined) product.logistics.weightKg = Number(body.weightKg);
  if (body.lengthCm !== undefined) product.logistics.lengthCm = Number(body.lengthCm);
  if (body.breadthCm !== undefined) product.logistics.breadthCm = Number(body.breadthCm);
  if (body.heightCm !== undefined) product.logistics.heightCm = Number(body.heightCm);

  if (body.warrantyAvailable !== undefined) product.warranty.available = Boolean(body.warrantyAvailable);
  if (body.warrantyDuration !== undefined) product.warranty.duration = body.warrantyDuration;
  if (body.warrantyDescription !== undefined) product.warranty.description = body.warrantyDescription;
  if (body.specifications) product.specifications = body.specifications;

  const contentChanged = [
    'name',
    'brand',
    'modelNumber',
    'category',
    'globalCategoryId',
    'subcategory',
    'description',
    'highlights',
    'specifications',
    'warranty',
  ].some((path) => product.isModified(path));
  if (contentChanged && (product.status === 'REJECTED' || product.status === 'ACTIVE')) {
    product.status = 'PENDING_REVIEW';
    product.rejectionReason = '';
  }

  if (body.globalCategoryId !== undefined || body.specifications !== undefined) {
    const category = await GlobalCategory.findById(product.globalCategoryId);
    const specificationError = category ? validateCategorySpecifications(category, product.specifications) : 'Marketplace category is unavailable.';
    if (specificationError) return sendError(res, specificationError, null, 400);
  }
  if (product.pricing.sellingPrice > product.pricing.mrp) return sendError(res, 'Selling price cannot exceed MRP.', null, 400);
  if (product.pricing.discount < 0 || product.pricing.discount > 100) return sendError(res, 'Discount must be between 0 and 100.', null, 400);
  if (product.pricing.tax < 0 || product.pricing.tax > 100) return sendError(res, 'GST/tax rate must be between 0 and 100.', null, 400);

  await product.save();
  return sendSuccess(res, 'Product updated successfully.', { product });
});

export const updateProductStatus = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    return sendError(res, "Status must be either 'ACTIVE' or 'INACTIVE'.", null, 400);
  }

  const product = await Product.findOne({ _id: id, retailerId: req.retailerId, isDeleted: false });
  if (!product) {
    return sendError(res, 'Product not found.', null, 404);
  }

  if (['PENDING_REVIEW', 'REJECTED'].includes(product.status)) {
    return sendError(res, 'Products awaiting review or rejected by Platform Admin cannot be published by the seller.', null, 400);
  }

  product.status = status;
  await product.save();

  return sendSuccess(res, `Product status updated to ${status}.`, { product });
});

export const updateProductImages = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { deletePublicIds, primaryPublicId, imageOrders } = req.body;

  const product = await Product.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!product) {
    return sendError(res, 'Product not found.', null, 404);
  }

  // 1. Delete requested images
  let currentImages = [...product.images];
  if (deletePublicIds) {
    const idsToDelete = Array.isArray(deletePublicIds) ? deletePublicIds : JSON.parse(deletePublicIds);
    await deleteImages(idsToDelete);
    currentImages = currentImages.filter((img) => !idsToDelete.includes(img.publicId));
  }

  // 2. Upload new images if attached
  if (req.files && req.files.length > 0) {
    if (currentImages.length + req.files.length > 10) {
      return sendError(
        res,
        `Cannot upload ${req.files.length} images. Maximum 10 images allowed per product (currently has ${currentImages.length}).`,
        null,
        400
      );
    }

    const folder = `retailer/products/${product._id}`;
    const uploadResults = await Promise.allSettled(req.files.map((file) => uploadImage(file.buffer, folder)));
    const failedUpload = uploadResults.find((result) => result.status === 'rejected');
    const successfulUploads = uploadResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);
    successfulUploads.forEach((result) => {
      currentImages.push({
        url: result.url,
        publicId: result.publicId,
        isPrimary: currentImages.length === 0,
        sortOrder: currentImages.length,
      });
    });
    if (failedUpload) {
      await deleteImages(successfulUploads.map((result) => result.publicId));
      throw failedUpload.reason;
    }
  }

  // 3. Update primary image designation if requested
  if (primaryPublicId) {
    currentImages = currentImages.map((img) => ({
      ...img.toObject(),
      isPrimary: img.publicId === primaryPublicId,
    }));
  }

  // 4. Ensure at least one primary image exists if images exist
  if (currentImages.length > 0 && !currentImages.some((img) => img.isPrimary)) {
    currentImages[0].isPrimary = true;
  }

  // 5. Reorder if imageOrders provided
  if (imageOrders) {
    const orders = typeof imageOrders === 'string' ? JSON.parse(imageOrders) : imageOrders;
    currentImages = currentImages.map((img) => {
      const orderEntry = orders.find((o) => o.publicId === img.publicId);
      return {
        ...img,
        sortOrder: orderEntry ? orderEntry.sortOrder : img.sortOrder,
      };
    });
    currentImages.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const imagesChanged = Boolean(deletePublicIds) || Boolean(req.files?.length) || Boolean(primaryPublicId) || Boolean(imageOrders);
  product.images = currentImages;
  if (imagesChanged && ['ACTIVE', 'INACTIVE', 'REJECTED'].includes(product.status)) {
    product.status = 'ACTIVE';
  }
  await product.save();

  return sendSuccess(res, 'Product images updated successfully.', { images: product.images, product });
});

export const deleteProduct = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!product) {
    return sendError(res, 'Product not found.', null, 404);
  }

  // Soft delete product
  product.isDeleted = true;
  product.status = 'INACTIVE';
  await product.save();

  logger.info(`Product soft deleted: ${product.name} (ID: ${product._id})`);

  return sendSuccess(res, 'Product deleted successfully.');
});
