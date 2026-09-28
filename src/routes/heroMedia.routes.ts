import express from 'express';
import { getPublicHeroMedia } from '../controllers/heroMedia.controller';

const router = express.Router();

// Public route - no auth
router.get('/', getPublicHeroMedia);

export default router;
