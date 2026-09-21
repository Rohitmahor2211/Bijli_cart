import { Router } from 'express';
import {
  register,
  login,
  refreshSession,
  getMe,
  logout,
  logoutAll,
  getSessions,
  sendOtpHandler,
  verifyOtpHandler,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { uploadSellerDocuments } from '../middleware/upload.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';
import {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', uploadSellerDocuments, validateBody(registerSchema), register);
router.post('/login', authRateLimiter, validateBody(loginSchema), login);
router.post('/send-otp', authRateLimiter, validateBody(sendOtpSchema), sendOtpHandler);
router.post('/verify-otp', authRateLimiter, validateBody(verifyOtpSchema), verifyOtpHandler);
router.post('/refresh', refreshSession);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.post('/logout', logout);
router.post('/logout-all', logoutAll);
router.get('/sessions', getSessions);

export default router;
