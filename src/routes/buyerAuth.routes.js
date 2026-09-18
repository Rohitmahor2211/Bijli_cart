import { Router } from 'express';
import { getBuyerMe, logoutBuyer, refreshBuyerSession, registerBuyer, sendBuyerLoginOtp, verifyBuyerOtp } from '../controllers/buyerAuth.controller.js';
import { protectBuyer } from '../middleware/buyerAuth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { buyerRegisterSchema, buyerSendOtpSchema, buyerVerifyOtpSchema } from '../validators/buyerAuth.validator.js';

const router = Router();
router.post('/register', authRateLimiter, validateBody(buyerRegisterSchema), registerBuyer);
router.post('/login/send-otp', otpRateLimiter, validateBody(buyerSendOtpSchema), sendBuyerLoginOtp);
router.post('/verify-otp', validateBody(buyerVerifyOtpSchema), verifyBuyerOtp);
router.post('/refresh', refreshBuyerSession);
router.use(protectBuyer);
router.get('/me', getBuyerMe); router.post('/logout', logoutBuyer);
export default router;
