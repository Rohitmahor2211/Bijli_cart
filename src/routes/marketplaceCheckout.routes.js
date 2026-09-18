import { Router } from 'express';
import { cancelCheckoutPayment, createCheckout, verifyCheckoutPayment } from '../controllers/marketplaceCheckout.controller.js';
import { protectBuyer } from '../middleware/buyerAuth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { cancelPaymentSchema, checkoutSchema, verifyPaymentSchema } from '../validators/marketplaceCheckout.validator.js';

const router = Router();
router.use(protectBuyer);
router.post('/', validateBody(checkoutSchema), createCheckout);
router.post('/verify', validateBody(verifyPaymentSchema), verifyCheckoutPayment);
router.post('/cancel', validateBody(cancelPaymentSchema), cancelCheckoutPayment);
export default router;
