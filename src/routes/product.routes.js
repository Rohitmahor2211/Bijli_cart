import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
  updateProductImages,
  deleteProduct,
  getPublicProducts,
  getPublicProductById
} from '../controllers/product.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadProductImages } from '../middleware/upload.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../validators/product.validator.js';

const router = Router();

// Public routes (no auth required)
router.get('/public', getPublicProducts);
router.get('/public/:id', getPublicProductById);

router.use(protect);

router
  .route('/')
  .post(uploadProductImages, validateBody(createProductSchema), createProduct)
  .get(validateQuery(productQuerySchema), getProducts);

router
  .route('/:id')
  .get(getProductById)
  .patch(validateBody(updateProductSchema), updateProduct)
  .delete(deleteProduct);

router.patch('/:id/status', updateProductStatus);
router.patch('/:id/images', uploadProductImages, updateProductImages);

export default router;
