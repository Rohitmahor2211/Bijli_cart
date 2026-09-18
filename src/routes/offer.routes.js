import { Router } from 'express';
import {
  createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  validateOffer,
} from '../controllers/offer.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
  createOfferSchema,
  updateOfferSchema,
  validateOfferSchema,
} from '../validators/offer.validator.js';

const router = Router();

router.use(protect);

router.post('/validate', validateBody(validateOfferSchema), validateOffer);

router
  .route('/')
  .post(validateBody(createOfferSchema), createOffer)
  .get(getOffers);

router
  .route('/:id')
  .get(getOfferById)
  .patch(validateBody(updateOfferSchema), updateOffer)
  .delete(deleteOffer);

export default router;
