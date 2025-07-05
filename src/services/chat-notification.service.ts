import Notification, { NotificationType, NotificationPriority } from '../models/notification.model';
import User from '../models/user.model';
import DirectMessage from '../models/directMessage.model';
import Message from '../models/message.model';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../config/database';

export class ChatNotificationService {
  /**
   * Create a notification for a new hub message mention
   */
  static async createHubMentionNotification(
    mentionedUserId: string,
    senderId: string,
    messageId: string,
    roomId: string,
    content: string
  ): Promise<Notification> {
    try {
      const sender = await User.findByPk(senderId, {
        attributes: ['firstName', 'lastName']
      });

      const message = `${sender?.firstName} ${sender?.lastName} mentioned you in Hub Community: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`;

      // Store sender info in relatedEntityType field since senderId doesn't exist in DB
      return Notification.create({
        userId: mentionedUserId,
        type: NotificationType.MESSAGE_MENTION,
        message,
        relatedEntityId: messageId,
        relatedEntityType: `Message:${senderId}`, // Include sender ID here
        priority: NotificationPriority.MEDIUM
        // Omit non-existent columns: senderId, messageId, roomId
      });
    } catch (error) {
      console.error('Error creating hub mention notification:', error);
      throw error;
    }
  }

  /**
   * Create a notification for a new direct message
   */
  static async createDirectMessageNotification(
    receiverId: string,
    senderId: string,
    messageId: string,
    content: string
  ): Promise<Notification> {
    try {
      const sender = await User.findByPk(senderId, {
        attributes: ['firstName', 'lastName']
      });

      const message = `New message from ${sender?.firstName} ${sender?.lastName}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`;

      // Store sender info in relatedEntityType field since senderId doesn't exist in DB
      return Notification.create({
        userId: receiverId,
        type: NotificationType.DIRECT_MESSAGE,
        message,
        relatedEntityId: messageId,
        relatedEntityType: `DirectMessage:${senderId}`, // Include sender ID here
        priority: NotificationPriority.HIGH
        // Omit non-existent columns: senderId, messageId
      });
    } catch (error) {
      console.error('Error creating direct message notification:', error);
      throw error;
    }
  }

  /**
   * Create a notification for a message being deleted
   */
  static async createMessageDeletedNotification(
    receiverId: string,
    senderId: string,
    isDirectMessage: boolean
  ): Promise<Notification> {
    try {
      const sender = await User.findByPk(senderId, {
        attributes: ['firstName', 'lastName']
      });

      const message = `${sender?.firstName} ${sender?.lastName} deleted a message ${isDirectMessage ? 'in your conversation' : 'from the Hub Community'}`;

      // Store sender info in relatedEntityType since senderId doesn't exist in DB
      return Notification.create({
        userId: receiverId,
        type: NotificationType.MESSAGE_DELETED,
        message,
        relatedEntityType: `${isDirectMessage ? 'DirectMessage' : 'Message'}:${senderId}`,
        priority: NotificationPriority.LOW
        // Omit non-existent column: senderId
      });
    } catch (error) {
      console.error('Error creating message deleted notification:', error);
      throw error;
    }
  }

  /**
   * Create a notification for a message being edited
   */
  static async createMessageEditedNotification(
    receiverId: string,
    senderId: string,
    messageId: string,
    isDirectMessage: boolean
  ): Promise<Notification> {
    try {
      const sender = await User.findByPk(senderId, {
        attributes: ['firstName', 'lastName']
      });

      const message = `${sender?.firstName} ${sender?.lastName} edited a message ${isDirectMessage ? 'in your conversation' : 'in the Hub Community'}`;

      // Store sender info in relatedEntityType since senderId doesn't exist in DB
      return Notification.create({
        userId: receiverId,
        type: NotificationType.MESSAGE_EDITED,
        message,
        relatedEntityId: messageId,
        relatedEntityType: `${isDirectMessage ? 'DirectMessage' : 'Message'}:${senderId}`,
        priority: NotificationPriority.LOW
        // Omit non-existent columns: senderId, messageId
      });
    } catch (error) {
      console.error('Error creating message edited notification:', error);
      throw error;
    }
  }

  /**
   * Get unread chat notifications for a user
   */
  static async getUnreadChatNotifications(userId: string): Promise<Notification[]> {
    return Notification.findAll({
      where: {
        userId,
        isRead: false,
        type: {
          [Op.in]: [
            NotificationType.DIRECT_MESSAGE,
            NotificationType.MESSAGE_MENTION,
            NotificationType.MESSAGE_DELETED,
            NotificationType.MESSAGE_EDITED
          ]
        }
      },
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Mark all chat notifications as read for a conversation
   * This version works with your existing database schema
   */
  static async markConversationNotificationsAsRead(userId: string, otherUserId: string): Promise<number> {
    try {
      // Since senderId column doesn't exist, we stored sender info in relatedEntityType
      // Update all direct message notifications for this user as read
      const [updatedRows] = await Notification.update(
        { isRead: true },
        {
          where: {
            userId,
            type: NotificationType.DIRECT_MESSAGE,
            isRead: false,
            // Use relatedEntityType to filter by sender ID
            [Op.or]: [
              { relatedEntityType: { [Op.like]: `DirectMessage:${otherUserId}%` } },
              { relatedEntityType: 'DirectMessage' } // Backward compatibility with old notifications
            ]
          }
        }
      );

      return updatedRows;
    } catch (error) {
      console.error('Error marking conversation notifications as read:', error);
      // Non-critical operation, continue without marking notifications
      return 0;
    }
  }
}

export default ChatNotificationService;