import { Router } from 'express';
import { createPost, getFeed, getExplore, getPost, deletePost, likePost, unlikePost } from '../controllers/postController.js';
import { addReaction, removeReaction } from '../controllers/reactionController.js';
import { addComment, getComments } from '../controllers/commentController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadMedia } from '../middleware/upload.js';

const router = Router();

// All post routes require auth
router.use(authenticate);

router.post('/', uploadMedia, createPost);
router.get('/feed', getFeed);
router.get('/explore', getExplore);
router.get('/:id', getPost);
router.delete('/:id', deletePost);

// Likes
router.post('/:id/like', likePost);
router.delete('/:id/like', unlikePost);

// Reactions
router.post('/:id/react', addReaction);
router.delete('/:id/react', removeReaction);

// Comments
router.post('/:id/comments', addComment);
router.get('/:id/comments', getComments);

export default router;
