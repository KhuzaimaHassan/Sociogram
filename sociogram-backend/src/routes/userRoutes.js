import { Router } from 'express';
import { getProfile, updateProfile, followUser, unfollowUser, searchUsers } from '../controllers/userController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/search', authenticate, searchUsers);
router.put('/me', authenticate, updateProfile);
router.get('/:username', optionalAuth, getProfile);
router.post('/:id/follow', authenticate, followUser);
router.delete('/:id/follow', authenticate, unfollowUser);

export default router;
