import { Router } from 'express';
import {
  createBanner,
  createFeaturedBrand,
  createStaff,
  getOperationsOverview,
  listAuditLogs,
  listBanners,
  listPlatformBuyers,
  listPlatformCommissions,
  getPlatformAnalytics,
  listPlatformOrders,
  confirmSellerPayment,
  markPlatformOrderDelivered,
  listPlatformPayouts,
  listPlatformRefunds,
  listPlatformReturns,
  listPlatformTickets,
  listStaff,
  listFeaturedBrandsAdmin,
  updateBanner,
  updateFeaturedBrand,
  updatePlatformTicket,
  updateStaff,
} from '../controllers/platformOperations.controller.js';
import { protectPlatformAdmin, requireAdminRoles } from '../middleware/platformAdmin.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
  bannerSchema,
  createStaffSchema,
  featuredBrandSchema,
  updateBannerSchema,
  updateBrandSchema,
  updateStaffSchema,
  updateTicketSchema,
} from '../validators/platformOperations.validator.js';
import { sellerPaymentSchema } from '../validators/order.validator.js';

const router = Router();
router.use(protectPlatformAdmin);

router.get('/overview', requireAdminRoles('OPERATIONS_ADMIN'), getOperationsOverview);
router.get('/orders', requireAdminRoles('OPERATIONS_ADMIN'), listPlatformOrders);
router.post('/orders/:id/seller-payment', requireAdminRoles('OPERATIONS_ADMIN'), validateBody(sellerPaymentSchema), confirmSellerPayment);
router.post('/orders/:id/deliver', requireAdminRoles('OPERATIONS_ADMIN'), markPlatformOrderDelivered);
router.get('/buyers', requireAdminRoles('OPERATIONS_ADMIN'), listPlatformBuyers);
router.get('/payouts', requireAdminRoles('OPERATIONS_ADMIN'), listPlatformPayouts);
router.get('/refunds', requireAdminRoles('OPERATIONS_ADMIN'), listPlatformRefunds);
router.get('/commissions', requireAdminRoles('OPERATIONS_ADMIN'), listPlatformCommissions);
router.get('/analytics', requireAdminRoles('OPERATIONS_ADMIN'), getPlatformAnalytics);
router.get('/returns', requireAdminRoles('OPERATIONS_ADMIN'), listPlatformReturns);
router.get('/tickets', requireAdminRoles('SUPPORT_ADMIN', 'OPERATIONS_ADMIN'), listPlatformTickets);
router.patch('/tickets/:id', requireAdminRoles('SUPPORT_ADMIN', 'OPERATIONS_ADMIN'), validateBody(updateTicketSchema), updatePlatformTicket);
router.get('/audit-logs', requireAdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN'), listAuditLogs);
router.get('/staff', requireAdminRoles('SUPER_ADMIN'), listStaff);
router.post('/staff', requireAdminRoles('SUPER_ADMIN'), validateBody(createStaffSchema), createStaff);
router.patch('/staff/:id', requireAdminRoles('SUPER_ADMIN'), validateBody(updateStaffSchema), updateStaff);
router.get('/banners', requireAdminRoles('OPERATIONS_ADMIN', 'CATALOG_ADMIN'), listBanners);
router.post('/banners', requireAdminRoles('OPERATIONS_ADMIN', 'CATALOG_ADMIN'), validateBody(bannerSchema), createBanner);
router.patch('/banners/:id', requireAdminRoles('OPERATIONS_ADMIN', 'CATALOG_ADMIN'), validateBody(updateBannerSchema), updateBanner);
router.get('/featured-brands', requireAdminRoles('OPERATIONS_ADMIN', 'CATALOG_ADMIN'), listFeaturedBrandsAdmin);
router.post('/featured-brands', requireAdminRoles('OPERATIONS_ADMIN', 'CATALOG_ADMIN'), validateBody(featuredBrandSchema), createFeaturedBrand);
router.patch('/featured-brands/:id', requireAdminRoles('OPERATIONS_ADMIN', 'CATALOG_ADMIN'), validateBody(updateBrandSchema), updateFeaturedBrand);

export default router;
