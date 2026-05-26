import { Router } from 'express';
import { deleteComment } from '../controllers/commentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.delete('/:id', authenticate, deleteComment);

export default router;
