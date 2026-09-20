import { Router } from 'express';
import { getBuyerMe, loginBuyer, logoutBuyer, refreshBuyerSession, registerBuyer } from '../controllers/buyerAuth.controller.js';
import { protectBuyer } from '../middleware/buyerAuth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { buyerRegisterSchema, buyerLoginSchema } from '../validators/buyerAuth.validator.js';

const router = Router();
router.post('/register', authRateLimiter, validateBody(buyerRegisterSchema), registerBuyer);
router.post('/login', authRateLimiter, validateBody(buyerLoginSchema), loginBuyer);
router.post('/refresh', refreshBuyerSession);
router.use(protectBuyer);
router.get('/me', getBuyerMe); router.post('/logout', logoutBuyer);
export default router;
