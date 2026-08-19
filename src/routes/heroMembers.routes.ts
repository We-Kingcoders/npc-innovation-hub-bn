import express from 'express';
import { getPublicHeroMembers } from '../controllers/heroMembers.controller';

const router = express.Router();

// Public route - no auth
router.get('/', getPublicHeroMembers);

export default router;
