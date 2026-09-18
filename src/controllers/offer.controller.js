import { Offer } from '../models/offer.model.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, formatPaginationMeta } from '../utils/pagination.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

export const createOffer = asyncWrapper(async (req, res) => {
  const {
    name,
    code,
    type,
    value,
    products,
    categories,
    minimumOrderValue,
    maximumDiscount,
    startDate,
    endDate,
    isActive,
  } = req.body;

  const existingCode = await Offer.findOne({
    retailerId: req.retailerId,
    code: code.toUpperCase(),
    isDeleted: false,
  });

  if (existingCode) {
    return sendError(res, `Offer promo code '${code}' already exists.`, null, 409);
  }

  const offer = await Offer.create({
    retailerId: req.retailerId,
    name,
    code: code.toUpperCase(),
    type,
    value: Number(value),
    products: products || [],
    categories: categories || [],
    minimumOrderValue: Number(minimumOrderValue || 0),
    maximumDiscount: Number(maximumDiscount || 0),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  return sendSuccess(res, 'Offer created successfully.', { offer }, 201);
});

export const getOffers = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { activeOnly } = req.query;

  const filter = {
    retailerId: req.retailerId,
    isDeleted: false,
  };

  if (activeOnly === 'true') {
    filter.isActive = true;
    filter.startDate = { $lte: new Date() };
    filter.endDate = { $gte: new Date() };
  }

  const [offers, total] = await Promise.all([
    Offer.find(filter)
      .populate('products', 'name sku pricing')
      .populate('categories', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Offer.countDocuments(filter),
  ]);

  const paginationMeta = formatPaginationMeta(total, page, limit);

  return sendSuccess(res, 'Offers fetched successfully.', { offers }, 200, paginationMeta);
});

export const getOfferById = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const offer = await Offer.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  })
    .populate('products', 'name sku pricing')
    .populate('categories', 'name slug');

  if (!offer) {
    return sendError(res, 'Offer not found.', null, 404);
  }

  return sendSuccess(res, 'Offer details fetched.', { offer });
});

export const updateOffer = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const offer = await Offer.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!offer) {
    return sendError(res, 'Offer not found.', null, 404);
  }

  const body = req.body;

  if (body.code && body.code.toUpperCase() !== offer.code) {
    const duplicate = await Offer.findOne({
      retailerId: req.retailerId,
      code: body.code.toUpperCase(),
      _id: { $ne: offer._id },
      isDeleted: false,
    });
    if (duplicate) {
      return sendError(res, `Code '${body.code}' is already used by another offer.`, null, 409);
    }
    offer.code = body.code.toUpperCase();
  }

  if (body.name) offer.name = body.name;
  if (body.type) offer.type = body.type;
  if (body.value !== undefined) offer.value = Number(body.value);
  if (body.products) offer.products = body.products;
  if (body.categories) offer.categories = body.categories;
  if (body.minimumOrderValue !== undefined) offer.minimumOrderValue = Number(body.minimumOrderValue);
  if (body.maximumDiscount !== undefined) offer.maximumDiscount = Number(body.maximumDiscount);
  if (body.startDate) offer.startDate = new Date(body.startDate);
  if (body.endDate) offer.endDate = new Date(body.endDate);
  if (body.isActive !== undefined) offer.isActive = Boolean(body.isActive);

  await offer.save();
  return sendSuccess(res, 'Offer updated successfully.', { offer });
});

export const deleteOffer = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const offer = await Offer.findOne({
    _id: id,
    retailerId: req.retailerId,
    isDeleted: false,
  });

  if (!offer) {
    return sendError(res, 'Offer not found.', null, 404);
  }

  offer.isDeleted = true;
  offer.isActive = false;
  await offer.save();

  return sendSuccess(res, 'Offer deleted successfully.');
});

export const validateOffer = asyncWrapper(async (req, res) => {
  const { code, orderValue, items = [] } = req.body;

  const offer = await Offer.findOne({
    retailerId: req.retailerId,
    code: code.toUpperCase(),
    isDeleted: false,
  });

  if (!offer) {
    return sendError(res, 'Invalid promo code.', null, 404);
  }

  if (!offer.isActive) {
    return sendError(res, 'This offer is currently inactive.', null, 400);
  }

  const now = new Date();
  if (now < new Date(offer.startDate) || now > new Date(offer.endDate)) {
    return sendError(res, 'Offer has expired or is not yet active.', null, 400);
  }

  if (orderValue < offer.minimumOrderValue) {
    return sendError(
      res,
      `Minimum order value of ₹${offer.minimumOrderValue} required for this offer.`,
      null,
      400
    );
  }

  let discountAmount = 0;

  if (offer.type === 'PERCENTAGE') {
    discountAmount = (orderValue * offer.value) / 100;
  } else if (offer.type === 'FIXED') {
    discountAmount = offer.value;
  } else if (offer.type === 'PRODUCT') {
    const eligibleItem = items.find((item) =>
      offer.products.some((pId) => pId.toString() === item.productId)
    );
    if (!eligibleItem) {
      return sendError(res, 'Cart does not contain products eligible for this offer.', null, 400);
    }
    discountAmount = (eligibleItem.price * eligibleItem.quantity * offer.value) / 100;
  } else if (offer.type === 'CATEGORY') {
    const eligibleItem = items.find((item) =>
      offer.categories.some((cId) => cId.toString() === item.categoryId)
    );
    if (!eligibleItem) {
      return sendError(res, 'Cart does not contain categories eligible for this offer.', null, 400);
    }
    discountAmount = (eligibleItem.price * eligibleItem.quantity * offer.value) / 100;
  }

  if (offer.maximumDiscount > 0 && discountAmount > offer.maximumDiscount) {
    discountAmount = offer.maximumDiscount;
  }

  discountAmount = Math.min(discountAmount, orderValue);

  return sendSuccess(res, 'Offer code applied successfully.', {
    offer: {
      code: offer.code,
      name: offer.name,
      type: offer.type,
      value: offer.value,
    },
    discountAmount,
    finalTotal: orderValue - discountAmount,
  });
});
