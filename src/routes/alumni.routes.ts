import express from 'express';
import { getPublicAlumni } from '../controllers/alumni.controller';

const router = express.Router();

// Public route - no auth
router.get('/', getPublicAlumni);

export default router;
