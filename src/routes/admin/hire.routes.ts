import express from 'express';
import { protectRoute, restrictTo } from '../../middlewares/auth.middleware';
import {
  getAllInquiries,
  getInquiry,
  updateInquiry,
  deleteInquiry,
  replyToInquiry
} from '../../controllers/admin/hire.controller';

const router = express.Router();

// Protect all admin routes with authentication and Admin role restriction
router.use(protectRoute, restrictTo('Admin'));

// Admin routes for hire inquiries
router.get('/', getAllInquiries);
router.get('/:id', getInquiry);
router.put('/:id', updateInquiry);
router.delete('/:id', deleteInquiry);
router.post('/:id/reply', replyToInquiry);

export default router;