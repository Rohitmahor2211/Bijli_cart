import { Router } from 'express';
import { createProductReview, getProductReviews } from '../controllers/productReview.controller.js';
import { protectBuyer } from '../middleware/buyerAuth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { productReviewSchema } from '../validators/productReview.validator.js';

const router = Router();
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', protectBuyer, validateBody(productReviewSchema), createProductReview);
export default router;
