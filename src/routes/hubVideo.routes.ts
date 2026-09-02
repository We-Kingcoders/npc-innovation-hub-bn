import express from 'express';
import { getPublicHubVideo } from '../controllers/hubVideo.controller';

const router = express.Router();

// Public route - no auth
router.get('/', getPublicHubVideo);

export default router;
