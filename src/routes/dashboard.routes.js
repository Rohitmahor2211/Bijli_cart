import { Router } from 'express';
import { getDashboardOverview } from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);
router.get('/', getDashboardOverview);

export default router;
