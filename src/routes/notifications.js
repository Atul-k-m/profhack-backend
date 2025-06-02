import express from 'express';
import { 
  sendNotification, 
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/notificationsController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, sendNotification);

router.get('/:userId', verifyToken, getUserNotifications);

router.put('/:id/read', verifyToken, markNotificationAsRead);

router.put('/:userId/read-all', verifyToken, markAllNotificationsAsRead);

export default router;