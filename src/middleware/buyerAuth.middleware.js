import { Buyer } from '../models/buyer.model.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { sendError } from '../utils/apiResponse.js';

export const protectBuyer = async (req, res, next) => {
  try {
    const token = req.cookies?.buyerAccessToken || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return sendError(res, 'Customer authentication is required.', null, 401);
    const decoded = verifyAccessToken(token);
    if (decoded.role !== 'BUYER') return sendError(res, 'Customer authentication is required.', null, 401);
    const buyer = await Buyer.findById(decoded.id);
    if (!buyer?.isActive) return sendError(res, 'Customer account is unavailable.', null, 403);
    req.buyer = buyer; next();
  } catch { return sendError(res, 'Customer session is invalid or expired.', null, 401); }
};
