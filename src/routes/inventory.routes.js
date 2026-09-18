import { Router } from 'express';
import {
  addStockHandler,
  reduceStockHandler,
  adjustStockHandler,
  getInventoryList,
  getInventoryHistoryHandler,
  getLowStockProducts,
  getOutOfStockProducts,
} from '../controllers/inventory.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { stockUpdateSchema, stockAdjustSchema } from '../validators/inventory.validator.js';

const router = Router();

router.use(protect);

router.get('/', getInventoryList);
router.get('/low-stock', getLowStockProducts);
router.get('/out-of-stock', getOutOfStockProducts);

router.post('/:productId/add', validateBody(stockUpdateSchema), addStockHandler);
router.post('/:productId/reduce', validateBody(stockUpdateSchema), reduceStockHandler);
router.post('/:productId/adjust', validateBody(stockAdjustSchema), adjustStockHandler);
router.get('/:productId/history', getInventoryHistoryHandler);

export default router;
