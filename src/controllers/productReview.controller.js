import { Order } from '../models/order.model.js';
import { ProductReview } from '../models/productReview.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

export const getProductReviews = asyncWrapper(async (req, res) => {
  const reviews = await ProductReview.find({ productId: req.params.id, isVisible: true })
    .populate('buyerId', 'name')
    .sort({ createdAt: -1 });
  const summary = reviews.reduce((result, review) => {
    result.total += 1;
    result.average += review.rating;
    result.distribution[review.rating] += 1;
    return result;
  }, { total: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  summary.average = summary.total ? Number((summary.average / summary.total).toFixed(1)) : 0;
  return sendSuccess(res, 'Product reviews fetched.', { reviews, summary });
});

export const createProductReview = asyncWrapper(async (req, res) => {
  const productId = req.params.id;
  const purchased = await Order.exists({
    buyerId: req.buyer._id,
    orderStatus: 'DELIVERED',
    paymentStatus: { $in: ['PAID', 'REFUNDED'] },
    'items.productId': productId,
  });
  if (!purchased) return sendError(res, 'Reviews are available after a delivered purchase.', null, 403);
  const review = await ProductReview.findOneAndUpdate(
    { productId, buyerId: req.buyer._id },
    { ...req.body, productId, buyerId: req.buyer._id, isVisible: true },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return sendSuccess(res, 'Product review saved.', { review }, 201);
});
