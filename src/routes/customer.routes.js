import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
} from '../controllers/customer.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator.js';

const router = Router();

router.use(protect);

router
  .route('/')
  .post(validateBody(createCustomerSchema), createCustomer)
  .get(getCustomers);

router
  .route('/:id')
  .get(getCustomerById)
  .patch(validateBody(updateCustomerSchema), updateCustomer);

export default router;
