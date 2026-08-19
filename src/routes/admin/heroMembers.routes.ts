import express from 'express';
import { protectRoute, restrictTo } from '../../middlewares/auth.middleware';
import {
  getMembersPicker,
  getHeroMembers,
  addHeroMember,
  deleteHeroMember,
  reorderHeroMembers,
} from '../../controllers/admin/heroMembers.controller';
import {
  validateAddHeroMember,
  validateHeroMemberIdParam,
  validateReorderHeroMembers,
} from '../../validations/heroMembers.validation';

const router = express.Router();

// Protect all admin routes with authentication and Admin role restriction
router.use(protectRoute, restrictTo('Admin'));

// Member picker for the hero-section admin UI
router.get('/members/picker', getMembersPicker);

// Hero-section featured member management
router.get('/hero-members', getHeroMembers);
router.post('/hero-members', validateAddHeroMember, addHeroMember);
router.patch('/hero-members/reorder', validateReorderHeroMembers, reorderHeroMembers);
router.delete('/hero-members/:id', validateHeroMemberIdParam, deleteHeroMember);

export default router;
