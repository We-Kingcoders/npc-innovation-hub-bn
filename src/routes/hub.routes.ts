import express from 'express';
import { getHubMessages, sendHubMessage, editHubMessage, deleteHubMessage } from '../controllers/hub.controller';
import { protectRoute } from '../middlewares/auth.middleware';
import { canModifyHubMessage } from '../middlewares/chat-auth.middleware';

const router = express.Router();

// All hub routes require authentication
router.use(protectRoute);

// Hub message routes
router.get('/messages', getHubMessages);
router.post('/messages', sendHubMessage);
router.patch('/messages/:id', canModifyHubMessage, editHubMessage);
router.delete('/messages/:id', canModifyHubMessage, deleteHubMessage);

export default router;