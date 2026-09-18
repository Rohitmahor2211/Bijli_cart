import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';

const rateLimitHandler = (message) => (req, res) =>
  sendError(res, message, [{ code: 'RATE_LIMITED', message }], 429);

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  handler: rateLimitHandler('Too many authentication attempts. Please try again after 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 OTP requests per 15 minutes
  handler: rateLimitHandler('Too many OTP requests from this IP. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});
