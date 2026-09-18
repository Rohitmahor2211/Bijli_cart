import { Router } from 'express';
import { getProfile, updateProfile, updateLogo } from '../controllers/retailer.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadSingleLogo } from '../middleware/upload.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { updateProfileSchema } from '../validators/profile.validator.js';

const router = Router();

router.use(protect);

router.get('/profile', getProfile);
router.patch('/profile', validateBody(updateProfileSchema), updateProfile);
router.patch('/profile/logo', uploadSingleLogo, updateLogo);

export default router;
