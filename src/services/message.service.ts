import Message from '../models/message.model';
import DirectMessage from '../models/directMessage.model';
import User from '../models/user.model';
import Room from '../models/room.model';
import { Op, QueryTypes } from 'sequelize';
import RoomService from './room.service';
import sequelize from '../config/database'; // Adjust the path as needed
import { v4 as uuidv4 } from 'uuid'; // Add UUID package

export class MessageService {
  /**
   * Create a new message in the hub
   */
  static async createHubMessage(senderId: string, content: string): Promise<Message> {
    // Get the hub room
    const hubRoom = await RoomService.getHubRoom();

    // Create the message with explicit UUID generation
    return Message.create({
        id: uuidv4(), // Generate proper UUID instead of empty string
        senderId,
        roomId: hubRoom.id,
        content,
        timestamp: new Date()
    });
  }

  /**
   * Get messages from the hub with pagination
   */
  static async getHubMessages(page = 1, limit = 50): Promise<{ messages: Message[]; total: number }> {
    try {
      // Get the hub room
      const hubRoom = await RoomService.getHubRoom();

      const offset = (page - 1) * limit;

      const { count, rows } = await Message.findAndCountAll({
        where: {
          roomId: hubRoom.id,
          isDeleted: false
        },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
          }
        ],
        order: [['timestamp', 'DESC']],
        limit,
        offset
      });

      return {
        messages: rows,
        total: count
      };
    } catch (error) {
      console.error('Error in getHubMessages:', error);
      throw error;
    }
  }

  /**
   * Update a hub message
   */
  static async updateHubMessage(messageId: string, content: string, userId: string, isAdmin = false): Promise<Message | null> {
    const message = await Message.findByPk(messageId);

    if (!message) {
      return null;
    }

    // Only the sender or an admin can edit a message
    if (message.senderId !== userId && !isAdmin) {
      throw new Error('You do not have permission to edit this message');
    }

    await message.update({
      content,
      updatedAt: new Date()
    });

    return message;
  }

  /**
   * Delete a hub message (soft delete)
   */
  static async deleteHubMessage(messageId: string, userId: string, isAdmin = false): Promise<boolean> {
    const message = await Message.findByPk(messageId);

    if (!message) {
      return false;
    }

    // Only the sender or an admin can delete a message
    if (message.senderId !== userId && !isAdmin) {
      throw new Error('You do not have permission to delete this message');
    }

    await message.update({
      isDeleted: true
    });

    return true;
  }

  /**
   * Create a direct message - SAFE VERSION using raw SQL
   */
  static async createDirectMessageSafe(senderId: string, receiverId: string, content: string): Promise<DirectMessage> {
    try {
      // Generate a UUID explicitly
      const messageId = uuidv4();
      
      // Use raw SQL to create the message WITH explicit UUID
      const results = await sequelize.query(`
        INSERT INTO direct_messages 
          ("id", "senderId", "receiverId", "content", "timestamp", "isRead", "isDeleted", "createdAt", "updatedAt")
        VALUES 
          (:id, :senderId, :receiverId, :content, NOW(), false, false, NOW(), NOW())
        RETURNING *;
      `, {
        replacements: {
          id: messageId,
          senderId,
          receiverId,
          content
        },
        type: QueryTypes.SELECT
      });

      // Convert the raw result to a DirectMessage instance
      const messageData = (results as any[])[0];
      const directMessage = await DirectMessage.findByPk(messageData.id);
      if (!directMessage) {
        throw new Error('Failed to create direct message');
      }
      return directMessage;
    } catch (error) {
      console.error('Error in createDirectMessageSafe:', error);
      throw error;
    }
  }

  /**
   * Create a direct message - ORIGINAL VERSION
   * WARNING: This might have UUID issues - use createDirectMessageSafe instead
   */
  static async createDirectMessage(senderId: string, receiverId: string, content: string): Promise<DirectMessage> {
    // Generate a UUID explicitly to avoid empty string issues
    return DirectMessage.create({
        id: uuidv4(), // Generate UUID explicitly
        senderId,
        receiverId,
        content,
        timestamp: new Date(),
        isRead: false
    });
  }

 /**
 * Get direct messages between two users with pagination
 */
  static async getDirectMessages(
    userId1: string,
    userId2: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: DirectMessage[]; total: number }> {
    const offset = (page - 1) * limit;

    try {
      const { count, rows } = await DirectMessage.findAndCountAll({
        where: {
          [Op.or]: [
            { senderId: userId1, receiverId: userId2 },
            { senderId: userId2, receiverId: userId1 }
          ],
          isDeleted: false
        },
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
        ],
        order: [['createdAt', 'DESC']], // Using createdAt for ordering
        limit,
        offset
      });

      return {
        messages: rows,
        total: count
      };
    } catch (error) {
      console.error('Error in getDirectMessages:', error);
      throw error;
    }
  }

  /**
   * Update a direct message
   */
  static async updateDirectMessage(messageId: string, content: string, userId: string): Promise<DirectMessage | null> {
    const message = await DirectMessage.findByPk(messageId);

    if (!message) {
      return null;
    }

    // Only the sender can edit their message
    if (message.senderId !== userId) {
      throw new Error('You do not have permission to edit this message');
    }

    await message.update({
      content,
      updatedAt: new Date()
    });

    return message;
  }

  /**
   * Delete a direct message (soft delete)
   */
  static async deleteDirectMessage(messageId: string, userId: string): Promise<boolean> {
    const message = await DirectMessage.findByPk(messageId);

    if (!message) {
      return false;
    }

    // Only the sender can delete their message
    if (message.senderId !== userId) {
      throw new Error('You do not have permission to delete this message');
    }

    await message.update({
      isDeleted: true
    });

    return true;
  }

  /**
   * Mark direct messages as read
   */
  static async markDirectMessagesAsRead(senderId: string, receiverId: string): Promise<number> {
    const [updatedRows] = await DirectMessage.update(
      { isRead: true },
      {
        where: {
          senderId,
          receiverId,
          isRead: false
        }
      }
    );

    return updatedRows;
  }

  /**
   * Get unread message counts for a user
   */
  static async getUnreadMessageCounts(userId: string): Promise<{ [senderId: string]: number }> {
    const unreadMessages = await DirectMessage.findAll({
      attributes: ['senderId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: {
        receiverId: userId,
        isRead: false,
        isDeleted: false
      },
      group: ['senderId']
    });

    const counts: { [senderId: string]: number } = {};
    unreadMessages.forEach((row: any) => {
      counts[row.senderId] = parseInt(row.getDataValue('count'));
    });

    return counts;
  }

  /**
   * Get recent conversations for a user
   */
  static async getRecentConversations(userId: string): Promise<any[]> {
    // This query gets the most recent message from each conversation
    const result = await sequelize.query(`
      SELECT DISTINCT ON (other_user_id) 
        other_user_id,
        message_id,
        content,
        "senderId",
        "receiverId",
        "createdAt" as timestamp,
        "isRead"
      FROM (
        SELECT 
          CASE 
            WHEN "senderId" = :userId THEN "receiverId"
            ELSE "senderId"
          END as other_user_id,
          id as message_id,
          content,
          "senderId",
          "receiverId",
          "createdAt",
          "isRead"
        FROM direct_messages
        WHERE 
          ("senderId" = :userId OR "receiverId" = :userId)
          AND "isDeleted" = false
        ORDER BY "createdAt" DESC
      ) as messages
      ORDER BY other_user_id, timestamp DESC;
    `, {
      replacements: { userId },
      type: QueryTypes.SELECT
    });

    // Get user details for each conversation
    const userIds = result.map((row: any) => row.other_user_id);
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'firstName', 'lastName', 'email', 'image']
    });

    // Map users to conversations
    const userMap: { [id: string]: any } = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // Format the results with correct property names
    return result.map((row: any) => ({
      user: userMap[row.other_user_id],
      lastMessage: {
        id: row.message_id,
        content: row.content,
        senderId: row.senderId,
        receiverId: row.receiverId,
        timestamp: row.timestamp,
        isRead: row.isRead
      },
      unreadCount: row.senderId !== userId && !row.isRead ? 1 : 0
    }));
  }
}

export default MessageService;