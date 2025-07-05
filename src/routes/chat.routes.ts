import express from 'express';
import { 
  getDirectMessages, 
  sendDirectMessage, 
  editDirectMessage, 
  deleteDirectMessage,
  getConversations
} from '../controllers/chat.controller';
import { protectRoute } from '../middlewares/auth.middleware';
import { canModifyDirectMessage, isPartOfConversation } from '../middlewares/chat-auth.middleware';

const router = express.Router();

// All chat routes require authentication
router.use(protectRoute);

// Conversations
router.get('/', getConversations);

// Direct message routes
router.get('/:userId', getDirectMessages);
router.post('/:userId', sendDirectMessage);
router.patch('/:userId/:messageId', isPartOfConversation, canModifyDirectMessage, editDirectMessage);
router.delete('/:userId/:messageId', isPartOfConversation, canModifyDirectMessage, deleteDirectMessage);

export default router;