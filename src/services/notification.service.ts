/**
 * Notification Service
 * Manages notification operations for the Innovation Hub
 * 
 * @created_by Alain275
 * @created_at 2025-07-05 16:18:25 UTC
 */

import Notification, { NotificationType, NotificationPriority } from '../models/notification.model';
import { Op } from 'sequelize';
import User from '../models/user.model';

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    relatedEntityId?: string,
    relatedEntityType?: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    senderId?: string,
    messageId?: string,
    roomId?: string
  ): Promise<Notification> {
    return Notification.create({
      userId,
      type,
      message,
      relatedEntityId,
      relatedEntityType,
      priority,
      isRead: false,
      senderId,
      messageId,
      roomId
    });
  }

  /**
   * Get all notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: Notification[], total: number }> {
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return {
      notifications: rows,
      total: count
    };
  }

  /**
   * Get unread notifications for a user
   */
  static async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return Notification.findAll({
      where: {
        userId,
        isRead: false
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return Notification.count({
      where: {
        userId,
        isRead: false
      }
    });
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    const [updatedRows] = await Notification.update(
      { isRead: true },
      {
        where: { id: notificationId }
      }
    );

    return updatedRows > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const [updatedRows] = await Notification.update(
      { isRead: true },
      {
        where: {
          userId,
          isRead: false
        }
      }
    );

    return updatedRows;
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    const deletedRows = await Notification.destroy({
      where: { id: notificationId }
    });

    return deletedRows > 0;
  }

  /**
   * Mark all notifications related to a message as read
   */
  static async markMessageNotificationsAsRead(
    userId: string,
    messageId: string
  ): Promise<number> {
    const [updatedRows] = await Notification.update(
      { isRead: true },
      {
        where: {
          userId,
          messageId,
          isRead: false
        }
      }
    );

    return updatedRows;
  }

  /**
   * Mark all notifications from a sender as read
   */
  static async markSenderNotificationsAsRead(
    userId: string,
    senderId: string
  ): Promise<number> {
    const [updatedRows] = await Notification.update(
      { isRead: true },
      {
        where: {
          userId,
          senderId,
          isRead: false
        }
      }
    );

    return updatedRows;
  }

  /**
   * Get notifications by type
   */
  static async getNotificationsByType(
    userId: string,
    types: NotificationType[],
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: Notification[], total: number }> {
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where: {
        userId,
        type: {
          [Op.in]: types
        }
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return {
      notifications: rows,
      total: count
    };
  }

  /**
   * Get chat-related notifications
   */
  static async getChatNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: Notification[], total: number }> {
    return NotificationService.getNotificationsByType(
      userId,
      [
        NotificationType.DIRECT_MESSAGE,
        NotificationType.HUB_MESSAGE,
        NotificationType.MESSAGE_MENTION,
        NotificationType.MESSAGE_EDITED,
        NotificationType.MESSAGE_DELETED,
        NotificationType.MESSAGE_REACTION
      ],
      page,
      limit
    );
  }
}

export default NotificationService;