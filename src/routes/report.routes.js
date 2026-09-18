import { Router } from 'express';
import {
  getSalesReport,
  getProductReport,
  getCategoryReport,
  getProfitReport,
  getInventoryReport,
  getCustomerReport,
} from '../controllers/report.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/sales', getSalesReport);
router.get('/products', getProductReport);
router.get('/categories', getCategoryReport);
router.get('/profit', getProfitReport);
router.get('/inventory', getInventoryReport);
router.get('/customers', getCustomerReport);

export default router;
