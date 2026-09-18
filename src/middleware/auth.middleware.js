import { verifyAccessToken } from '../utils/jwt.js';
import { Retailer } from '../models/retailer.model.js';
import { sendError } from '../utils/apiResponse.js';

export const protect = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Authentication token is required. Please login.', null, 401);
    }

    const decoded = verifyAccessToken(token);

    const retailer = await Retailer.findById(decoded.id);
    if (!retailer) {
      return sendError(res, 'Retailer account no longer exists.', null, 401);
    }

    if (!retailer.isActive) {
      return sendError(res, 'Retailer account is deactivated. Please contact support.', null, 403);
    }

    if (retailer.sellerStatus !== 'APPROVED') {
      return sendError(res, 'Seller account approval is required to access this resource.', null, 403);
    }

    req.retailer = retailer;
    req.retailerId = retailer._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return sendError(res, 'Session expired or invalid token. Please log in again.', null, 401);
    }
    next(error);
  }
};
