import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
} from '../controllers/dmController.js';

const router = Router();

router.use(authenticate);

router.get('/', getConversations);
router.post('/', getOrCreateConversation);
router.get('/unread', getUnreadCount);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);

export default router;
