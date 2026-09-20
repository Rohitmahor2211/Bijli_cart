import bcrypt from "bcryptjs";
import { Buyer } from "../models/buyer.model.js";
import { BuyerSession } from "../models/buyerSession.model.js";
import { OTP } from "../models/otp.model.js";
import { createAndSendOTP, verifyOTP } from "../services/otp.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { env } from "../config/env.js";

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  maxAge,
});
const setBuyerCookies = (res, accessToken, refreshToken) => {
  res.cookie("buyerAccessToken", accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie(
    "buyerRefreshToken",
    refreshToken,
    cookieOptions(7 * 24 * 60 * 60 * 1000),
  );
};

export const registerBuyer = asyncWrapper(async (req, res) => {
  const { name, phone, email, city, password } = req.body;
  const existing = await Buyer.findOne({ phone });
  if (existing)
    return sendError(
      res,
      "An account already exists for this mobile number. Please sign in.",
      null,
      409,
    );
  const buyer = await Buyer.create({
    name,
    phone,
    email: email || "",
    defaultAddress: null,
    city,
    passwordHash: await bcrypt.hash(password, 12),
  });

  return sendSuccess(
    res,
    "Account created. Sign in to receive your verification OTP.",
    { buyer: { id: buyer.id, name: buyer.name, phone: buyer.phone } },
    201,
  );
});

export const loginBuyer = asyncWrapper(async (req, res) => {
  const buyer = await Buyer.findOne({ phone: req.body.phone, isActive: true }).select('+passwordHash');
  if (!buyer || !buyer.passwordHash || !(await bcrypt.compare(req.body.password, buyer.passwordHash))) {
    return sendError(res, "Invalid phone number or password.", null, 401);
  }
  const payload = { id: buyer._id, role: "BUYER" };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await BuyerSession.create({
    buyerId: buyer._id,
    refreshTokenHash: await bcrypt.hash(refreshToken, 12),
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || "",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  setBuyerCookies(res, accessToken, refreshToken);
  return sendSuccess(res, "Customer login successful.", {
    accessToken,
    refreshToken,
    buyer: { id: buyer.id, name: buyer.name, phone: buyer.phone, email: buyer.email },
  });
});

export const sendBuyerLoginOtp = asyncWrapper(async (req, res) => {
  const buyer = await Buyer.findOne({ phone: req.body.phone, isActive: true });
  if (!buyer)
    return sendError(
      res,
      "No customer account was found for this mobile number.",
      null,
      404,
    );
  const otpResult = await createAndSendOTP({
    phone: buyer.phone,
    purpose: "LOGIN",
    audience: "BUYER",
    displayName: buyer.name,
  });
  return sendSuccess(res, "OTP sent successfully.", {
    expiresAt: otpResult.expiresAt,
    ...(otpResult.devOtp && { devOtp: otpResult.devOtp }),
  });
});

export const verifyBuyerOtp = asyncWrapper(async (req, res) => {
  const { phone, otp } = req.body;
  const buyer = await Buyer.findOne({ phone, isActive: true });
  if (!buyer)
    return sendError(
      res,
      "Customer account was not found or is inactive.",
      null,
      404,
    );
  const challenge = await OTP.findOne({ phone, audience: "BUYER" }).sort({
    createdAt: -1,
  });
  const purpose = challenge?.purpose;
  if (!purpose)
    return sendError(
      res,
      "No active OTP was found. Request a new code.",
      null,
      400,
    );
  await verifyOTP({ phone, otp, purpose, audience: "BUYER" });
  const payload = { id: buyer._id, role: "BUYER" };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await BuyerSession.create({
    buyerId: buyer._id,
    refreshTokenHash: await bcrypt.hash(refreshToken, 10),
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || "",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  setBuyerCookies(res, accessToken, refreshToken);
  return sendSuccess(res, "Customer login successful.", {
    accessToken,
    refreshToken,
    buyer: {
      id: buyer.id,
      name: buyer.name,
      phone: buyer.phone,
      email: buyer.email,
    },
  });
});

export const refreshBuyerSession = asyncWrapper(async (req, res) => {
  const refreshToken =
    req.cookies?.buyerRefreshToken || req.body?.refreshToken;
  if (!refreshToken)
    return sendError(res, "Customer refresh token is required.", null, 401);
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      res.clearCookie("buyerAccessToken");
      res.clearCookie("buyerRefreshToken");
      return sendError(
        res,
        "Customer session expired. Please login again.",
        null,
        401,
      );
    }
    throw error;
  }
  if (decoded.role !== "BUYER")
    return sendError(res, "Customer session is invalid.", null, 401);
  const buyer = await Buyer.findById(decoded.id);
  if (!buyer?.isActive)
    return sendError(res, "Customer account is unavailable.", null, 403);
  const sessions = await BuyerSession.find({
    buyerId: buyer._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  const session = await (async () => {
    for (const candidate of sessions)
      if (await bcrypt.compare(refreshToken, candidate.refreshTokenHash))
        return candidate;
    return null;
  })();
  if (!session)
    return sendError(res, "Customer session is invalid.", null, 401);
  session.revokedAt = new Date();
  await session.save();
  const payload = { id: buyer._id, role: "BUYER" };
  const accessToken = generateAccessToken(payload);
  const nextRefreshToken = generateRefreshToken(payload);
  await BuyerSession.create({
    buyerId: buyer._id,
    refreshTokenHash: await bcrypt.hash(nextRefreshToken, 10),
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || "",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  setBuyerCookies(res, accessToken, nextRefreshToken);
  return sendSuccess(res, "Customer session refreshed.", {
    accessToken,
    refreshToken: nextRefreshToken,
  });
});

export const getBuyerMe = asyncWrapper(async (req, res) =>
  sendSuccess(res, "Customer profile fetched.", { buyer: req.buyer }),
);

export const logoutBuyer = asyncWrapper(async (req, res) => {
  const refreshToken = req.cookies?.buyerRefreshToken;
  if (refreshToken) {
    const sessions = await BuyerSession.find({
      buyerId: req.buyer._id,
      revokedAt: null,
    });
    for (const session of sessions)
      if (await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
        session.revokedAt = new Date();
        await session.save();
        break;
      }
  }
  res.clearCookie("buyerAccessToken");
  res.clearCookie("buyerRefreshToken");
  return sendSuccess(res, "Customer logged out successfully.");
});
