import { Router } from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.put('/read', markAsRead);

export default router;
