import express from 'express';
import { 
  getUserNotifications, 
  getUnreadNotificationCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification
} from '../controllers/notification.controller';
import { protectRoute } from '../middlewares/auth.middleware';

const router = express.Router();

// All notification routes require authentication
router.use(protectRoute);

// Notification routes
router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.patch('/:id/mark-read', markNotificationAsRead);
router.patch('/mark-all-read', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);

export default router;