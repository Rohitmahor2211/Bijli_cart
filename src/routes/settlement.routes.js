import { Router } from 'express';
import { getMySettlement } from '../controllers/settlement.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);
router.get('/me', getMySettlement);
export default router;
