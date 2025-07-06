import express from 'express';
import { submitHireInquiry } from '../controllers/hire.controller';

const router = express.Router();

// Public route
router.post('/', submitHireInquiry);

export default router;