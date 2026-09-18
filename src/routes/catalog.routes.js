import { Router } from 'express';
import { getCatalogCategory, getCatalogCategoryProducts, getCatalogNavigation, getSellerCatalogCategories, searchCatalog } from '../controllers/catalog.controller.js';
import { validateQuery } from '../middleware/validation.middleware.js';
import { catalogProductsQuerySchema } from '../validators/catalog.validator.js';

const router = Router();
router.get('/navigation', getCatalogNavigation);
router.get('/seller-categories', getSellerCatalogCategories);
router.get('/search', validateQuery(catalogProductsQuerySchema), searchCatalog);
router.get('/categories/:slug', getCatalogCategory);
router.get('/categories/:slug/products', validateQuery(catalogProductsQuerySchema), getCatalogCategoryProducts);
export default router;
