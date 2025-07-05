import { Request, Response } from 'express';
import MessageService from '../services/message.service';
import User from '../models/user.model';
import DirectMessage from '../models/directMessage.model';
import ChatNotificationService from '../services/chat-notification.service';
import { getSocket } from './../socketio';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid'; // Make sure to install this: npm install uuid

export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    const conversations = await MessageService.getRecentConversations(currentUser.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        conversations
      }
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversations'
    });
  }
};

export const getDirectMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const otherUserId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Validate other user exists
    const otherUser = await User.findByPk(otherUserId);
    if (!otherUser) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
      return;
    }

    // Get direct messages between users
    const { messages, total } = await MessageService.getDirectMessages(
      currentUser.id,
      otherUserId,
      page,
      limit
    );

    // Mark messages as read
    await MessageService.markDirectMessagesAsRead(otherUserId, currentUser.id);
    
    // Mark related notifications as read
    try {
      await ChatNotificationService.markConversationNotificationsAsRead(currentUser.id, otherUserId);
    } catch (notificationError) {
      console.error('Error marking notifications as read:', notificationError);
      // Continue despite notification errors
    }

    res.status(200).json({
      status: 'success',
      data: {
        messages,
        otherUser: {
          id: otherUser.id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          image: otherUser.image,
          role: otherUser.role
        },
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting direct messages:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get messages'
    });
  }
};

export const sendDirectMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const receiverId = req.params.userId;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      res.status(400).json({
        status: 'fail',
        message: 'Message content cannot be empty'
      });
      return;
    }

    // Validate receiver exists
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      res.status(404).json({
        status: 'fail',
        message: 'Receiver not found'
      });
      return;
    }

    // Generate UUID explicitly here for the message
    const messageId = uuidv4();

    // Use raw SQL to create the message, WITH an explicit UUID
    let message;
    try {
      // Create direct message using raw SQL with explicit UUID
      const [results]: any = await sequelize.query(`
        INSERT INTO direct_messages 
          ("id", "senderId", "receiverId", "content", "timestamp", "isRead", "isDeleted", "createdAt", "updatedAt")
        VALUES 
          (:id, :senderId, :receiverId, :content, NOW(), false, false, NOW(), NOW())
        RETURNING *;
      `, {
        replacements: {
          id: messageId,
          senderId: currentUser.id,
          receiverId,
          content
        },
        type: QueryTypes.INSERT
      });

      // Convert raw result to message object
      const messageData = Array.isArray(results) ? results[0] : results;
      message = await DirectMessage.findByPk(messageData.id);
    } catch (createError) {
      console.error('Error creating direct message:', createError);
      throw new Error('Failed to create message');
    }

    // Check if message was found
    if (!message) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve created message'
      });
      return;
    }

    // Load the message with sender and receiver details
    const populatedMessage = await DirectMessage.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
        }
      ]
    });

    // Create notification with error handling
    let notification;
    try {
      notification = await ChatNotificationService.createDirectMessageNotification(
        receiverId,
        currentUser.id,
        message.id,
        content
      );
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Continue even if notification creation fails
    }

    // Emit the message to the receiver via socket
    const socket = getSocket();
    if (socket) {
      socket.to(receiverId).emit('receive_dm', populatedMessage);
      if (notification) {
        socket.to(receiverId).emit('new_notification', notification);
      }
    }

    res.status(201).json({
      status: 'success',
      data: {
        message: populatedMessage
      }
    });
  } catch (error) {
    console.error('Error sending direct message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message'
    });
  }
};

/**
 * Partially update a direct message (PATCH endpoint)
 */
export const editDirectMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const userId = req.params.userId;
    const messageId = req.params.messageId;
    const { content } = req.body;

    // Validate the request body
    if (!content || content.trim() === '') {
      res.status(400).json({
        status: 'fail',
        message: 'Message content cannot be empty'
      });
      return;
    }

    try {
      // Check if message exists first
      const message = await DirectMessage.findByPk(messageId);
      if (!message) {
        res.status(404).json({
          status: 'fail',
          message: 'Message not found'
        });
        return;
      }
      
      // Update the message
      const updatedMessage = await MessageService.updateDirectMessage(
        messageId,
        content,
        currentUser.id
      );

      if (!updatedMessage) {
        res.status(404).json({
          status: 'fail',
          message: 'Message not found or could not be updated'
        });
        return;
      }

      // Load the updated message with details
      const populatedMessage = await DirectMessage.findByPk(messageId, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
          }
        ]
      });

      // Create notification for receiver about the edit
      if (updatedMessage.receiverId !== currentUser.id) {
        try {
          const notification = await ChatNotificationService.createMessageEditedNotification(
            updatedMessage.receiverId,
            currentUser.id,
            messageId,
            true
          );

          // Emit notification to receiver
          const socket = getSocket();
          if (socket) {
            socket.to(updatedMessage.receiverId).emit('edit_dm', {
              messageId,
              content,
              updatedAt: updatedMessage.updatedAt
            });
            socket.to(updatedMessage.receiverId).emit('new_notification', notification);
          }
        } catch (notificationError) {
          console.error('Error creating edit notification:', notificationError);
          // Continue despite notification errors
        }
      }

      res.status(200).json({
        status: 'success',
        data: {
          message: populatedMessage
        }
      });
    } catch (error) {
      // Check if it's a permission error
      if (error instanceof Error && error.message === 'You do not have permission to edit this message') {
        res.status(403).json({
          status: 'fail',
          message: error.message
        });
        return;
      }

      throw error;
    }
  } catch (error) {
    console.error('Error editing direct message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to edit message'
    });
  }
};

export const deleteDirectMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const userId = req.params.userId;
    const messageId = req.params.messageId;

    try {
      // Find message before delete to get receiver ID
      const message = await DirectMessage.findByPk(messageId);
      if (!message) {
        res.status(404).json({
          status: 'fail',
          message: 'Message not found'
        });
        return;
      }

      // Store receiver ID for notification
      const receiverId = message.receiverId === currentUser.id ? message.senderId : message.receiverId;

      // Delete the message
      const success = await MessageService.deleteDirectMessage(messageId, currentUser.id);

      if (!success) {
        res.status(404).json({
          status: 'fail',
          message: 'Message not found'
        });
        return;
      }

      // Create notification for other user
      try {
        const notification = await ChatNotificationService.createMessageDeletedNotification(
          receiverId,
          currentUser.id,
          true
        );

        // Emit deletion event to the other user
        const socket = getSocket();
        if (socket) {
          socket.to(receiverId).emit('delete_dm', { messageId });
          socket.to(receiverId).emit('new_notification', notification);
        }
      } catch (notificationError) {
        console.error('Error creating delete notification:', notificationError);
        // Continue despite notification errors
      }

      res.status(200).json({
        status: 'success',
        message: 'Message deleted successfully'
      });
    } catch (error) {
      // Check if it's a permission error
      if (error instanceof Error && error.message === 'You do not have permission to delete this message') {
        res.status(403).json({
          status: 'fail',
          message: error.message
        });
        return;
      }

      throw error;
    }
  } catch (error) {
    console.error('Error deleting direct message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete message'
    });
  }
};