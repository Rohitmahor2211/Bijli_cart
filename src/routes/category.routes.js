import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getPublicCategories
} from '../controllers/category.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadSingleCategoryImage } from '../middleware/upload.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator.js';

const router = Router();

// Public route (no auth required)
router.get('/public', getPublicCategories);

router.use(protect);

router
  .route('/')
  .post(uploadSingleCategoryImage, validateBody(createCategorySchema), createCategory)
  .get(getCategories);

router
  .route('/:id')
  .get(getCategoryById)
  .patch(uploadSingleCategoryImage, validateBody(updateCategorySchema), updateCategory)
  .delete(deleteCategory);

export default router;
