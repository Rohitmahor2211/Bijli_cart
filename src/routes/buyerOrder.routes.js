import { Router } from 'express';
import { getBuyerOrderById, getBuyerOrders } from '../controllers/buyerOrder.controller.js';
import { cancelBuyerOrder, requestBuyerReturn } from '../controllers/buyerOrder.controller.js';
import { protectBuyer } from '../middleware/buyerAuth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { buyerOrderReasonSchema } from '../validators/buyerAuth.validator.js';

const router = Router();
router.use(protectBuyer);
router.get('/', getBuyerOrders);
router.get('/:id', getBuyerOrderById);
router.post('/:id/cancel', validateBody(buyerOrderReasonSchema), cancelBuyerOrder);
router.post('/:id/return-request', validateBody(buyerOrderReasonSchema), requestBuyerReturn);
export default router;
