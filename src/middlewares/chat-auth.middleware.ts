
import { Request, Response, NextFunction } from 'express';
import Message from '../models/message.model';
import DirectMessage from '../models/directMessage.model';
import User from '../models/user.model';

// Extend Express Request interface to include targetUser
declare global {
  namespace Express {
    interface Request {
      targetUser?: typeof User.prototype;
    }
  }
}

// Check if the user has permission to modify a hub message
export const canModifyHubMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const messageId = req.params.id;
    
    const message = await Message.findByPk(messageId);
    
    if (!message) {
      res.status(404).json({
        status: 'fail',
        message: 'Message not found'
      });
      return;
    }
    
    // Check if the user is the sender or an admin
    if (message.senderId === currentUser.id || currentUser.role === 'Admin') {
      next();
    } else {
      res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to modify this message'
      });
    }
  } catch (error) {
    console.error('Error in canModifyHubMessage middleware:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Check if the user has permission to modify a direct message
export const canModifyDirectMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const messageId = req.params.messageId;
    
    const message = await DirectMessage.findByPk(messageId);
    
    if (!message) {
      res.status(404).json({
        status: 'fail',
        message: 'Message not found'
      });
      return;
    }
    
    // Check if the user is the sender
    if (message.senderId === currentUser.id) {
      next();
    } else {
      res.status(403).json({
        status: 'fail',
        message: 'You can only modify your own messages'
      });
    }
  } catch (error) {
    console.error('Error in canModifyDirectMessage middleware:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Middleware to check if the user is part of the conversation
export const isPartOfConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const otherUserId = req.params.userId;
    const messageId = req.params.messageId;
    
    if (messageId) {
      const message = await DirectMessage.findByPk(messageId);
      
      if (!message) {
        res.status(404).json({
          status: 'fail',
          message: 'Message not found'
        });
        return;
      }
      
      // Check if the user is part of the conversation
      if (
        (message.senderId === currentUser.id && message.receiverId === otherUserId) ||
        (message.receiverId === currentUser.id && message.senderId === otherUserId)
      ) {
        next();
      } else {
        res.status(403).json({
          status: 'fail',
          message: 'You are not part of this conversation'
        });
      }
    } else {
      // When creating a new message, simply proceed
      next();
    }
  } catch (error) {
    console.error('Error in isPartOfConversation middleware:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Middleware to ensure the user is an admin
export const isAdmin = async (
  req: Request,
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    if (currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Access denied. Admin privileges required.'
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Error in isAdmin middleware:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Middleware to ensure a user exists
export const userExists = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId;
    const user = await User.findByPk(userId);
    
    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
      return;
    }
    
    // Attach the user to the request for later use
    req.targetUser = user;
    next();
  } catch (error) {
    console.error('Error in userExists middleware:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};