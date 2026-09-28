import express from 'express';
import { protectRoute, restrictTo } from '../../middlewares/auth.middleware';
import {
  getAllContactMessages,
  getContactMessage,
  updateContactMessage,
  deleteContactMessage,
  replyToContactMessage,
} from '../../controllers/admin/contact.controller';

const router = express.Router();

router.use(protectRoute, restrictTo('Admin'));

router.get('/', getAllContactMessages);
router.get('/:id', getContactMessage);
router.patch('/:id', updateContactMessage);
router.delete('/:id', deleteContactMessage);
router.post('/:id/reply', replyToContactMessage);

export default router;
