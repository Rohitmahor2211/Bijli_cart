import bcrypt from 'bcryptjs';
import { Retailer } from '../models/retailer.model.js';
import { Session } from '../models/session.model.js';
import { createAndSendOTP, verifyOTP } from '../services/otp.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { logger } from '../utils/logger.js';
import { encryptBankAccount } from '../services/bankEncryption.service.js';

export const register = asyncWrapper(async (req, res) => {
  const { shopName, ownerName, phone, email, password, address, city, state, pincode, gstNumber, panNumber, mainCategory, deliveryPreference, accountHolderName, accountNumber, ifscCode, bankName, branchName, upiId } = req.body;

  const existingPhone = await Retailer.findOne({ phone });
  if (existingPhone) {
    return sendError(res, 'A retailer account with this phone number already exists.', null, 409);
  }

  const existingEmail = await Retailer.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    return sendError(res, 'A retailer account with this email address already exists.', null, 409);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const retailer = await Retailer.create({
      shopName, ownerName, phone, email, passwordHash, address, city, state, pincode, gstNumber, panNumber,
      mainCategory, deliveryPreference,
      bankDetails: { accountHolderName, accountNumberEncrypted: encryptBankAccount(accountNumber), accountNumberLast4: accountNumber.slice(-4), ifscCode, bankName, branchName, upiId },
      sellerAgreement: { accepted: true, acceptedAt: new Date() },
    });

  logger.info(`Retailer registration submitted: ${shopName} (${phone})`);

  return sendSuccess(res, 'Registration submitted for verification.', { retailer: retailer.toJSON() }, 201);
});

export const login = asyncWrapper(async (req, res) => {
  const { phone, password } = req.body;

  const retailer = await Retailer.findOne({ phone }).select('+passwordHash');
  if (!retailer) {
    return sendError(res, 'Invalid phone number or password.', null, 401);
  }

  if (!retailer.isActive) {
    return sendError(res, 'Retailer account is deactivated. Please contact support.', null, 403);
  }

  if (retailer.sellerStatus !== 'APPROVED') {
    return sendError(res, 'Your seller account is pending compliance approval. You will be able to log in once approved.', null, 403);
  }

  const isPasswordMatch = await bcrypt.compare(password, retailer.passwordHash);
  if (!isPasswordMatch) {
    return sendError(res, 'Invalid phone number or password.', null, 401);
  }

  const otpResult = await createAndSendOTP({
    phone: retailer.phone,
    purpose: 'LOGIN',
    audience: 'RETAILER',
    displayName: retailer.ownerName,
    shopName: retailer.shopName,
  });
  return sendSuccess(res, 'Password verified. OTP verification is required.', {
    otpRequired: true,
    requiresOtp: true,
    phone: retailer.phone,
    expiresAt: otpResult.expiresAt,
    ...(otpResult.devOtp && { devOtp: otpResult.devOtp }),
  });
});

export const sendOtpHandler = asyncWrapper(async (req, res) => {
  const { phone, purpose } = req.body;

  const retailer = await Retailer.findOne({ phone });
  if (!retailer) {
    return sendError(res, 'No retailer account registered with this phone number.', null, 404);
  }

  if (purpose === 'LOGIN' && retailer.sellerStatus !== 'APPROVED') {
    return sendError(res, 'Your seller account is pending compliance approval. You will be able to log in once approved.', null, 403);
  }

  const otpResult = await createAndSendOTP({
    phone,
    purpose,
    displayName: retailer.ownerName,
    shopName: retailer.shopName,
  });

  return sendSuccess(res, 'OTP dispatched successfully.', {
    phone,
    expiresAt: otpResult.expiresAt,
    ...(otpResult.devOtp && { devOtp: otpResult.devOtp }),
  });
});

export const verifyOtpHandler = asyncWrapper(async (req, res) => {
  const { phone, otp, purpose } = req.body;

  const retailer = await Retailer.findOne({ phone });
  if (!retailer) {
    return sendError(res, 'Retailer record not found.', null, 404);
  }

  if (purpose === 'LOGIN' && retailer.sellerStatus !== 'APPROVED') {
    return sendError(res, 'Your seller account is pending compliance approval. You will be able to log in once approved.', null, 403);
  }

  // Verify OTP code
  await verifyOTP({ phone, otp, purpose });

  // Older local test sellers may predate the mandatory compliance fields. Do
  // not validate/rewrite their full profile merely to record a successful OTP
  // login; profile validation remains enforced on registration and updates.
  await Retailer.updateOne(
    { _id: retailer._id },
    { $set: { isVerified: true, lastLoginAt: new Date() } }
  );

  // Create JWT tokens
  const payload = { id: retailer._id, phone: retailer.phone, role: 'RETAILER' };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store Session
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ipAddress = req.ip || req.socket.remoteAddress || '';
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await Session.create({
    retailerId: retailer._id,
    refreshTokenHash,
    userAgent,
    ipAddress,
    expiresAt,
  });

  setAuthCookies(res, accessToken, refreshToken);

  logger.info(`Retailer verified & logged in: ${retailer.shopName} (Session: ${session._id})`);

  return sendSuccess(res, 'Login verification successful.', {
    accessToken,
    refreshToken,
    retailer: retailer.toJSON(),
  });
});

export const refreshSession = asyncWrapper(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return sendError(res, 'Refresh token is required.', null, 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    clearAuthCookies(res);
    return sendError(res, 'Invalid or expired refresh token. Please login again.', null, 401);
  }

  const retailer = await Retailer.findById(decoded.id);
  if (!retailer || !retailer.isActive) {
    clearAuthCookies(res);
    return sendError(res, 'Account inactive or removed.', null, 401);
  }

  if (retailer.sellerStatus !== 'APPROVED') {
    clearAuthCookies(res);
    return sendError(res, 'Seller account approval is required. Please log in after admin approval.', null, 403);
  }

  // Check active sessions
  const activeSessions = await Session.find({
    retailerId: retailer._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  let matchingSession = null;
  for (const session of activeSessions) {
    const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (match) {
      matchingSession = session;
      break;
    }
  }

  if (!matchingSession) {
    clearAuthCookies(res);
    return sendError(res, 'Session revoked or expired. Please login again.', null, 401);
  }

  // Generate new Access Token
  const newAccessToken = generateAccessToken({ id: retailer._id, phone: retailer.phone, role: 'RETAILER' });

  // Update session lastUsedAt
  matchingSession.lastUsedAt = new Date();
  await matchingSession.save();

  setAuthCookies(res, newAccessToken, refreshToken);

  return sendSuccess(res, 'Token refreshed successfully.', {
    accessToken: newAccessToken,
  });
});

export const getMe = asyncWrapper(async (req, res) => {
  return sendSuccess(res, 'Current retailer profile fetched.', {
    retailer: req.retailer.toJSON(),
  });
});

export const logout = asyncWrapper(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (refreshToken) {
    const activeSessions = await Session.find({
      retailerId: req.retailerId,
      revokedAt: null,
    });

    for (const session of activeSessions) {
      const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (match) {
        session.revokedAt = new Date();
        await session.save();
        break;
      }
    }
  }

  clearAuthCookies(res);
  logger.info(`Retailer logged out: ${req.retailer.shopName}`);

  return sendSuccess(res, 'Logged out successfully.');
});

export const logoutAll = asyncWrapper(async (req, res) => {
  await Session.updateMany(
    { retailerId: req.retailerId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  clearAuthCookies(res);
  logger.info(`Retailer logged out all sessions: ${req.retailer.shopName}`);

  return sendSuccess(res, 'Logged out from all active sessions successfully.');
});

export const getSessions = asyncWrapper(async (req, res) => {
  const sessions = await Session.find({
    retailerId: req.retailerId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('-refreshTokenHash');

  return sendSuccess(res, 'Active sessions retrieved.', { sessions });
});
