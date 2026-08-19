import express from 'express';
import { protectRoute, restrictTo } from '../../middlewares/auth.middleware';
import { acceptApplication } from '../../controllers/admin/application.controller';

const router = express.Router();

// Protect all admin routes with authentication and Admin role restriction
router.use(protectRoute, restrictTo('Admin'));

router.patch('/:id/accept', acceptApplication);

export default router;
