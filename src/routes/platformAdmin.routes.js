import { Router } from "express";
import {
  createGlobalCategory,
  decideProductModeration,
  decideSellerCompliance,
  getGlobalCategories,
  getPendingSellers,
  getProductModerationQueue,
  loginPlatformAdmin,
  sendPlatformAdminOtp,
  refreshPlatformAdminSession,
  logoutPlatformAdmin,
  registerPlatformAdmin,
  updateGlobalCategory,
  updateProductSpecifications,
  verifyPlatformAdminOtp,
} from "../controllers/platformAdmin.controller.js";
import {
  protectPlatformAdmin,
  requireAdminRoles,
} from "../middleware/platformAdmin.middleware.js";
import { authRateLimiter } from "../middleware/rateLimiter.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import {
  createGlobalCategorySchema,
  platformAdminLoginSchema,
  platformAdminSendOtpSchema,
  platformAdminRegistrationSchema,
  platformAdminVerifyOtpSchema,
  productModerationSchema,
  sellerComplianceSchema,
  updateGlobalCategorySchema,
  updateProductSpecificationsSchema,
} from "../validators/platformAdmin.validator.js";
import {
  getPlatformAdminNotifications,
  markAllPlatformAdminNotificationsRead,
  markPlatformAdminNotificationRead,
} from "../controllers/platformAdminNotification.controller.js";

const router = Router();

router.post(
  "/login",
  authRateLimiter,
  validateBody(platformAdminLoginSchema),
  loginPlatformAdmin,
);
router.post("/send-otp", authRateLimiter, validateBody(platformAdminSendOtpSchema), sendPlatformAdminOtp);
router.post("/verify-otp", authRateLimiter, validateBody(platformAdminVerifyOtpSchema), verifyPlatformAdminOtp);
router.post("/login/verify-otp", authRateLimiter, validateBody(platformAdminVerifyOtpSchema), verifyPlatformAdminOtp);
router.post(
  "/register",
  authRateLimiter,
  validateBody(platformAdminRegistrationSchema),
  registerPlatformAdmin,
);
router.post("/refresh", refreshPlatformAdminSession);
router.use(protectPlatformAdmin);
router.get("/me", (req, res) =>
  res.json({
    success: true,
    data: { admin: req.platformAdmin.toJSON() },
    message: "Platform administrator profile fetched.",
    errors: [],
  }),
);
router.post("/logout", logoutPlatformAdmin);
router.get("/notifications", getPlatformAdminNotifications);
router.patch("/notifications/read-all", markAllPlatformAdminNotificationsRead);
router.patch("/notifications/:id/read", markPlatformAdminNotificationRead);
router.get(
  "/sellers",
  requireAdminRoles("OPERATIONS_ADMIN"),
  getPendingSellers,
);
router.patch(
  "/sellers/:id/compliance",
  requireAdminRoles("OPERATIONS_ADMIN"),
  validateBody(sellerComplianceSchema),
  decideSellerCompliance,
);
router.get(
  "/categories",
  requireAdminRoles("CATALOG_ADMIN"),
  getGlobalCategories,
);
router.post(
  "/categories",
  requireAdminRoles("CATALOG_ADMIN"),
  validateBody(createGlobalCategorySchema),
  createGlobalCategory,
);
router.patch(
  "/categories/:id",
  requireAdminRoles("CATALOG_ADMIN"),
  validateBody(updateGlobalCategorySchema),
  updateGlobalCategory,
);
router.get(
  "/products",
  requireAdminRoles("CATALOG_ADMIN"),
  getProductModerationQueue,
);
router.patch(
  "/products/:id/moderation",
  requireAdminRoles("CATALOG_ADMIN"),
  validateBody(productModerationSchema),
  decideProductModeration,
);
router.patch(
  "/products/:id/specifications",
  requireAdminRoles("CATALOG_ADMIN"),
  validateBody(updateProductSpecificationsSchema),
  updateProductSpecifications,
);

export default router;
