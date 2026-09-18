import { Router } from 'express';
import { getBuyerNotifications, getBuyerUnreadCount, markBuyerNotificationRead } from '../controllers/buyerNotification.controller.js';
import { protectBuyer } from '../middleware/buyerAuth.middleware.js';

const router = Router(); router.use(protectBuyer);
router.get('/', getBuyerNotifications); router.get('/unread-count', getBuyerUnreadCount); router.patch('/:id/read', markBuyerNotificationRead);
export default router;
