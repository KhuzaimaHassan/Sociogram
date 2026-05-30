import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadMedia } from '../middleware/upload.js';
import { getStories, createStory, viewStory, deleteStory } from '../controllers/storyController.js';

const router = Router();
router.use(authenticate);

router.get('/', getStories);
router.post('/', uploadMedia, createStory);
router.post('/:id/view', viewStory);
router.delete('/:id', deleteStory);

export default router;
