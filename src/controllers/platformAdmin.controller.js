import { PlatformAdmin } from "../models/platformAdmin.model.js";
import { Retailer } from "../models/retailer.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { GlobalCategory } from "../models/globalCategory.model.js";
import { Product } from "../models/product.model.js";
import {
  specificationsToObject,
  validateCategorySpecifications,
} from "../services/catalogFilters.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { env } from "../config/env.js";
import { createAndSendOTP, verifyOTP } from "../services/otp.service.js";

const safeSeller = (seller) => seller.toJSON();
const normalizeIndianPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return String(value || "").trim();
};
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const loginPlatformAdmin = asyncWrapper(async (req, res) => {
  const phone = normalizeIndianPhone(req.body.phone);
  const admin = await PlatformAdmin.findOne({ phone });
  if (!admin || !admin.isActive)
    return sendError(
      res,
      "No active platform administrator was found for this phone number.",
      null,
      401,
    );
  const otpResult = await createAndSendOTP({
    phone: admin.phone,
    purpose: "LOGIN",
    audience: "PLATFORM_ADMIN",
    displayName: admin.name,
  });
  return sendSuccess(res, "Administrator OTP sent successfully.", {
    phone: admin.phone,
    requiresOtp: true,
    expiresAt: otpResult.expiresAt,
    ...(otpResult.devOtp && { devOtp: otpResult.devOtp }),
  });
});

export const verifyPlatformAdminOtp = asyncWrapper(async (req, res) => {
  const phone = normalizeIndianPhone(req.body.phone);
  const { otp } = req.body;
  const admin = await PlatformAdmin.findOne({ phone });
  if (!admin || !admin.isActive)
    return sendError(
      res,
      "Administrator account is inactive or unavailable.",
      null,
      401,
    );
  await verifyOTP({ phone, otp, purpose: "LOGIN", audience: "PLATFORM_ADMIN" });
  admin.lastLoginAt = new Date();
  await admin.save();
  const accessToken = generateAccessToken({
    id: admin._id,
    role: "PLATFORM_ADMIN",
    adminRole: admin.role,
  });
  const refreshToken = generateRefreshToken({
    id: admin._id,
    role: "PLATFORM_ADMIN",
    adminRole: admin.role,
  });
  res.cookie("platformAdminAccessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("platformAdminRefreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return sendSuccess(res, "Platform administrator login successful.", {
    admin: admin.toJSON(),
    accessToken,
    refreshToken,
  });
});

export const refreshPlatformAdminSession = asyncWrapper(async (req, res) => {
  const refreshToken = req.cookies?.platformAdminRefreshToken;
  if (!refreshToken)
    return sendError(
      res,
      "Platform administrator refresh token is required.",
      null,
      401,
    );
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return sendError(
        res,
        "Platform administrator session expired. Please login again.",
        null,
        401,
      );
    }
    throw error;
  }
  if (decoded.role !== "PLATFORM_ADMIN")
    return sendError(res, "Invalid platform administrator session.", null, 401);
  const admin = await PlatformAdmin.findById(decoded.id);
  if (!admin || !admin.isActive)
    return sendError(
      res,
      "Platform administrator account is inactive or unavailable.",
      null,
      401,
    );
  const accessToken = generateAccessToken({
    id: admin._id,
    role: "PLATFORM_ADMIN",
    adminRole: admin.role,
  });
  res.cookie("platformAdminAccessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 15 * 60 * 1000,
  });
  return sendSuccess(res, "Platform administrator session refreshed.");
});

export const registerPlatformAdmin = asyncWrapper(async (req, res) => {
  if (!env.PLATFORM_ADMIN_REGISTRATION_KEY) {
    return sendError(
      res,
      "Platform administrator registration is disabled. Configure PLATFORM_ADMIN_REGISTRATION_KEY for the initial setup.",
      null,
      503,
    );
  }

  const setupKey = req.get("x-platform-admin-setup-key");
  if (!setupKey || setupKey !== env.PLATFORM_ADMIN_REGISTRATION_KEY) {
    return sendError(
      res,
      "Invalid platform administrator setup key.",
      null,
      401,
    );
  }

  if (await PlatformAdmin.exists({})) {
    return sendError(
      res,
      "The initial platform administrator already exists. Create additional staff from the secured platform operations panel.",
      null,
      409,
    );
  }

  const { name, phone } = req.body;
  const admin = await PlatformAdmin.create({
    name,
    phone,
    role: "SUPER_ADMIN",
  });

  return sendSuccess(
    res,
    "Initial platform administrator registered. Sign in through the private platform login path.",
    { admin: admin.toJSON() },
    201,
  );
});

export const logoutPlatformAdmin = asyncWrapper(async (req, res) => {
  res.clearCookie("platformAdminAccessToken");
  res.clearCookie("platformAdminRefreshToken");
  return sendSuccess(res, "Platform administrator logged out.", null);
});

export const getPendingSellers = asyncWrapper(async (req, res) => {
  const status = req.query.status || "PENDING";
  const sellers = await Retailer.find({ sellerStatus: status }).sort({
    createdAt: 1,
  });
  return sendSuccess(res, "Seller compliance queue fetched.", {
    sellers: sellers.map(safeSeller),
  });
});

export const decideSellerCompliance = asyncWrapper(async (req, res) => {
  const { decision, reason = "" } = req.body;
  if (!["APPROVED", "REJECTED", "SUSPENDED"].includes(decision))
    return sendError(
      res,
      "Decision must be APPROVED, REJECTED, or SUSPENDED.",
      null,
      400,
    );
  if (decision === "REJECTED" && !reason.trim())
    return sendError(res, "A rejection reason is required.", null, 400);
  const seller = await Retailer.findById(req.params.id);
  if (!seller) return sendError(res, "Seller not found.", null, 404);
  const previousStatus = seller.sellerStatus;
  seller.sellerStatus = decision;
  seller.isActive = decision !== "SUSPENDED";
  seller.documents.forEach((document) => {
    document.status =
      decision === "APPROVED"
        ? "VERIFIED"
        : decision === "REJECTED"
          ? "REJECTED"
          : document.status;
  });

  await seller.save();
  await AuditLog.create({
    retailerId: seller._id,
    actorType: "PLATFORM_ADMIN",
    actorId: req.platformAdmin._id,
    action: `SELLER_COMPLIANCE_${decision}`,
    entityType: "Retailer",
    entityId: seller._id,
    metadata: { previousStatus, decision, reason },
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });

  return sendSuccess(res, `Seller ${decision.toLowerCase()} successfully.`, {
    seller: safeSeller(seller),
  });
});

export const getGlobalCategories = asyncWrapper(async (req, res) => {
  const categories = await GlobalCategory.find({})
    .sort({ level: 1, "navigation.headerPosition": 1, name: 1 })
    .lean();
  return sendSuccess(res, "Marketplace categories fetched.", { categories });
});

export const createGlobalCategory = asyncWrapper(async (req, res) => {
  const {
    name,
    parentId = null,
    showInHeader = false,
    headerPosition = 999,
    description = "",
    commissionPercent = null,
    specificationDefinitions = [],
  } = req.body;
  const slug = slugify(name);
  if (!slug)
    return sendError(res, "A valid category name is required.", null, 400);
  if (await GlobalCategory.exists({ slug }))
    return sendError(
      res,
      "A marketplace category with this name already exists.",
      null,
      409,
    );
  let parent = null;
  if (parentId) {
    parent = await GlobalCategory.findOne({ _id: parentId, isActive: true });
    if (!parent)
      return sendError(
        res,
        "Selected parent marketplace category was not found.",
        null,
        400,
      );
  }
  const category = await GlobalCategory.create({
    name: name.trim(),
    slug,
    parentId: parent?._id || null,
    path: parent ? [...parent.path, parent._id] : [],
    level: parent ? parent.level + 1 : 0,
    isLeaf: true,
    navigation: {
      showInHeader: !parent && Boolean(showInHeader),
      headerPosition: Number(headerPosition) || 999,
      showOnHome: !parent && Boolean(showInHeader),
    },
    seo: {
      title: `${name.trim()} | BijliCart`,
      description: description.trim(),
    },
    commissionPercent,
    specificationDefinitions,
    filterSchema: specificationDefinitions,
  });
  if (parent?.isLeaf) {
    parent.isLeaf = false;
    await parent.save();
  }
  await AuditLog.create({
    actorType: "PLATFORM_ADMIN",
    actorId: req.platformAdmin._id,
    action: "GLOBAL_CATEGORY_CREATED",
    entityType: "GlobalCategory",
    entityId: category._id,
    metadata: { name: category.name, slug: category.slug },
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });
  return sendSuccess(res, "Marketplace category created.", { category }, 201);
});

export const updateGlobalCategory = asyncWrapper(async (req, res) => {
  const category = await GlobalCategory.findById(req.params.id);
  if (!category)
    return sendError(res, "Marketplace category not found.", null, 404);
  const {
    isActive,
    showInHeader,
    headerPosition,
    description,
    commissionPercent,
    specificationDefinitions,
  } = req.body;
  if (isActive !== undefined) category.isActive = Boolean(isActive);
  if (showInHeader !== undefined)
    category.navigation.showInHeader = category.parentId
      ? false
      : Boolean(showInHeader);
  if (headerPosition !== undefined)
    category.navigation.headerPosition = Number(headerPosition);
  if (description !== undefined)
    category.seo.description = String(description).trim();
  if (commissionPercent !== undefined)
    category.commissionPercent =
      commissionPercent === null ? null : Number(commissionPercent);
  if (specificationDefinitions !== undefined) {
    category.specificationDefinitions = specificationDefinitions;
    category.filterSchema = specificationDefinitions;
  }
  await category.save();
  await AuditLog.create({
    actorType: "PLATFORM_ADMIN",
    actorId: req.platformAdmin._id,
    action: "GLOBAL_CATEGORY_UPDATED",
    entityType: "GlobalCategory",
    entityId: category._id,
    metadata: {
      isActive: category.isActive,
      showInHeader: category.navigation.showInHeader,
    },
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });
  return sendSuccess(res, "Marketplace category updated.", { category });
});

export const getProductModerationQueue = asyncWrapper(async (req, res) => {
  const status = req.query.status || "PENDING_REVIEW";
  if (!["PENDING_REVIEW", "ACTIVE", "REJECTED", "INACTIVE"].includes(status))
    return sendError(res, "Invalid product moderation status.", null, 400);
  const products = await Product.find({ isDeleted: false, status })
    .populate("retailerId", "shopName ownerName email sellerStatus")
    .populate("globalCategoryId", "name slug")
    .sort({ createdAt: 1 });
  return sendSuccess(res, "Product moderation queue fetched.", { products });
});

export const decideProductModeration = asyncWrapper(async (req, res) => {
  const { decision, reason = "" } = req.body;
  const product = await Product.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!product) return sendError(res, "Product not found.", null, 404);
  const previousStatus = product.status;
  product.status = decision === "APPROVED" ? "ACTIVE" : "REJECTED";
  product.rejectionReason = decision === "REJECTED" ? reason.trim() : "";
  product.reviewedAt = new Date();
  if (decision === "APPROVED")
    product.submittedForReviewAt = product.submittedForReviewAt || new Date();
  await product.save();
  await AuditLog.create({
    retailerId: product.retailerId,
    actorType: "PLATFORM_ADMIN",
    actorId: req.platformAdmin._id,
    action: `PRODUCT_MODERATION_${decision}`,
    entityType: "Product",
    entityId: product._id,
    metadata: { previousStatus, decision, reason },
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });
  return sendSuccess(res, `Product ${decision.toLowerCase()} successfully.`, {
    product,
  });
});

export const updateProductSpecifications = asyncWrapper(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isDeleted: false,
  });
  if (!product) return sendError(res, "Product not found.", null, 404);
  const category = await GlobalCategory.findById(product.globalCategoryId);
  if (!category)
    return sendError(res, "Marketplace category is unavailable.", null, 400);
  const specificationError = validateCategorySpecifications(
    category,
    req.body.specifications,
  );
  if (specificationError) return sendError(res, specificationError, null, 400);
  const previousSpecifications = specificationsToObject(product.specifications);
  product.specifications = req.body.specifications;
  await product.save();
  await AuditLog.create({
    retailerId: product.retailerId,
    actorType: "PLATFORM_ADMIN",
    actorId: req.platformAdmin._id,
    action: "PRODUCT_SPECIFICATIONS_UPDATED",
    entityType: "Product",
    entityId: product._id,
    metadata: {
      previousSpecifications,
      specifications: req.body.specifications,
    },
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });
  return sendSuccess(res, "Product specifications updated.", { product });
});
