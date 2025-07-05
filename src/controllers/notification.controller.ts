import { Request, Response } from 'express';
import Notification from '../models/notification.model';
import { Op } from 'sequelize';

export const getUserNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Get unread count
    const unreadCount = await Notification.count({
      where: {
        userId: currentUser.id,
        isRead: false
      }
    });
    
    // Get notifications with pagination
    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: {
        userId: currentUser.id
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        notifications,
        unreadCount,
        total: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get notifications'
    });
  }
};

export const getUnreadNotificationCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    // Get unread count
    const unreadCount = await Notification.count({
      where: {
        userId: currentUser.id,
        isRead: false
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get unread notification count'
    });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const { id } = req.params;
    
    // Find the notification
    const notification = await Notification.findOne({
      where: {
        id,
        userId: currentUser.id
      }
    });
    
    if (!notification) {
      res.status(404).json({
        status: 'fail',
        message: 'Notification not found'
      });
      return;
    }
    
    // Mark as read
    notification.isRead = true;
    await notification.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark notification as read'
    });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    
    // Mark all as read
    await Notification.update(
      { isRead: true },
      {
        where: {
          userId: currentUser.id,
          isRead: false
        }
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark all notifications as read'
    });
  }
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    const { id } = req.params;
    
    // Find the notification
    const notification = await Notification.findOne({
      where: {
        id,
        userId: currentUser.id
      }
    });
    
    if (!notification) {
      res.status(404).json({
        status: 'fail',
        message: 'Notification not found'
      });
      return;
    }
    
    // Delete notification
    await notification.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete notification'
    });
  }
};