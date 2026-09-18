import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderPaymentStatus,
  cancelOrder,
  returnOrder,
  updateOrderFulfilment,
  updateOrderShippingAddress,
  decideReturnRequest,
} from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  fulfilmentUpdateSchema,
  returnDecisionSchema,
  cancelOrderSchema,
  updateShippingAddressSchema,
} from '../validators/order.validator.js';

const router = Router();

router.use(protect);

router
  .route('/')
  .post(validateBody(createOrderSchema), createOrder)
  .get(getOrders);

router.route('/:id').get(getOrderById);

router.patch('/:id/status', validateBody(updateOrderStatusSchema), updateOrderStatus);
router.patch('/:id/payment', validateBody(updatePaymentStatusSchema), updateOrderPaymentStatus);
router.patch('/:id/fulfilment', validateBody(fulfilmentUpdateSchema), updateOrderFulfilment);
router.patch('/:id/shipping-address', validateBody(updateShippingAddressSchema), updateOrderShippingAddress);
router.post('/:id/cancel', validateBody(cancelOrderSchema), cancelOrder);
router.post('/:id/return', returnOrder);
router.post('/:id/return-decision', validateBody(returnDecisionSchema), decideReturnRequest);

export default router;
