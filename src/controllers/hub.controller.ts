import { Request, Response } from 'express';
import MessageService from '../services/message.service';
import RoomService from '../services/room.service';
import { getSocket } from '../socketio';
import { extractMentions } from '../utils/message.utils';
import ChatNotificationService from '../services/chat-notification.service';
import Message from '../models/message.model';
import User from '../models/user.model';
import { v4 as uuidv4 } from 'uuid'; // Add UUID import

export const getHubMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    try {
      // Get the hub room
      const hubRoom = await RoomService.getHubRoom();

      // Make sure user is a participant (should be automatic, but just in case)
      const isParticipant = await RoomService.isUserInRoom(currentUser.id, hubRoom.id);
      if (!isParticipant) {
        await RoomService.addUserToRoom(currentUser.id, hubRoom.id);
      }

      // Get messages
      const { messages, total } = await MessageService.getHubMessages(page, limit);

      // Update last read timestamp
      await RoomService.updateLastRead(currentUser.id, hubRoom.id);

      res.status(200).json({
        status: 'success',
        data: {
          messages,
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching hub data:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error getting hub messages:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get hub messages'
    });
  }
};

export const sendHubMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const { content } = req.body;

    if (!content || content.trim() === '') {
      res.status(400).json({
        status: 'fail',
        message: 'Message content cannot be empty'
      });
      return;
    }

    // Get the hub room
    const hubRoom = await RoomService.getHubRoom();

    // Make sure user is a participant
    const isParticipant = await RoomService.isUserInRoom(currentUser.id, hubRoom.id);
    if (!isParticipant) {
      await RoomService.addUserToRoom(currentUser.id, hubRoom.id);
    }

    try {
      // Create the message with explicit UUID
      const messageId = uuidv4();
      const message = await Message.create({
        id: messageId,
        senderId: currentUser.id,
        roomId: hubRoom.id,
        content,
        timestamp: new Date()
      });

      // Load the sender details for the response
      const populatedMessage = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
          }
        ]
      });

      // Check for mentions and send notifications
      const mentions = extractMentions(content);
      if (mentions.length > 0) {
        const users = await User.findAll({
          where: {
            id: mentions
          }
        });

        // Create notifications for mentioned users
        for (const user of users) {
          await ChatNotificationService.createHubMentionNotification(
            user.id,
            currentUser.id,
            message.id,
            hubRoom.id,
            content
          );

          // Send socket notification
          const socket = getSocket();
          if (socket) {
            socket.to(user.id).emit('new_mention', {
              messageId: message.id,
              roomId: hubRoom.id,
              senderId: currentUser.id,
              content
            });
          }
        }
      }

      // Emit the new message to all connected clients in the hub room
      const socket = getSocket();
      if (socket) {
        socket.to(hubRoom.id).emit('receive_hub_msg', populatedMessage);
      }

      res.status(201).json({
        status: 'success',
        data: {
          message: populatedMessage
        }
      });
    } catch (error) {
      console.error('Error creating hub message:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error sending hub message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message'
    });
  }
};

/**
 * Partially update a hub message (PATCH endpoint)
 * Allows users to edit their own messages or admins to edit any message
 */
export const editHubMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const messageId = req.params.id;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      res.status(400).json({
        status: 'fail',
        message: 'Message content cannot be empty'
      });
      return;
    }

    try {
      // Check if message exists first
      const message = await Message.findByPk(messageId);
      if (!message) {
        res.status(404).json({
          status: 'fail',
          message: 'Message not found'
        });
        return;
      }
      
      // Update the message
      const updatedMessage = await MessageService.updateHubMessage(
        messageId,
        content,
        currentUser.id,
        currentUser.role === 'Admin'
      );

      if (!updatedMessage) {
        res.status(404).json({
          status: 'fail',
          message: 'Message not found or could not be updated'
        });
        return;
      }

      // Load the updated message with sender details
      const populatedMessage = await Message.findByPk(messageId, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
          }
        ]
      });

      // Get the hub room
      const hubRoom = await RoomService.getHubRoom();

      // Emit the edited message to all connected clients
      const socket = getSocket();
      if (socket) {
        socket.to(hubRoom.id).emit('edit_hub_msg', {
          messageId,
          content,
          updatedAt: updatedMessage.updatedAt
        });
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
    console.error('Error editing hub message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to edit message'
    });
  }
};

export const deleteHubMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const messageId = req.params.id;

    try {
      // Check if message exists first
      const message = await Message.findByPk(messageId);
      if (!message) {
        res.status(404).json({
          status: 'fail',
          message: 'Message not found'
        });
        return;
      }
      
      const success = await MessageService.deleteHubMessage(
        messageId,
        currentUser.id,
        currentUser.role === 'Admin'
      );

      if (!success) {
        res.status(404).json({
          status: 'fail',
          message: 'Message not found or could not be deleted'
        });
        return;
      }

      // Get the hub room
      const hubRoom = await RoomService.getHubRoom();

      // Emit the deleted message to all connected clients
      const socket = getSocket();
      if (socket) {
        socket.to(hubRoom.id).emit('delete_hub_msg', { messageId });
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
    console.error('Error deleting hub message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete message'
    });
  }
};