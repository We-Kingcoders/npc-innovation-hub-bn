import express from 'express';
import { emailSendLimiter } from '../middlewares/rateLimit.middleware';
import { validateContactMessage } from '../validations/contact.validation';
import { submitContactMessage } from '../controllers/contact.controller';

const router = express.Router();

// Public route - no auth. emailSendLimiter since this triggers a real
// outbound email per request, same reasoning as user.route.ts's
// /request-password-reset and /send-otp - Hire Us's own equivalent public
// endpoint has no rate limiter at all today, which is a gap worth not
// repeating here rather than blindly mirroring.
router.post('/', emailSendLimiter, validateContactMessage, submitContactMessage);

export default router;
