import { Router } from 'express';
import {
  getProfile, updateProfile,
  followUser, unfollowUser,
  searchUsers, getFollowers, getFollowing, getSuggested,
} from '../controllers/userController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/search', authenticate, searchUsers);
router.get('/suggested', authenticate, getSuggested);
router.put('/me', authenticate, updateProfile);
router.get('/:id/followers', authenticate, getFollowers);
router.get('/:id/following', authenticate, getFollowing);
router.get('/:username', optionalAuth, getProfile);
router.post('/:id/follow', authenticate, followUser);
router.delete('/:id/follow', authenticate, unfollowUser);

export default router;
