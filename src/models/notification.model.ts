/**
 * Notification Model (Updated with chat notifications)
 * 
 * @created_by Alain275
 * @created_at 2025-07-05 15:54:00 UTC
 */

import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

/**
 * Notification types for Innovation Hub activities
 */
export enum NotificationType {
  // Existing notification types
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_MILESTONE = 'project_milestone',
  PROJECT_COMPLETED = 'project_completed',
  PROJECT_FEEDBACK = 'project_feedback',
  
  // COLLABORATION_REQUEST = 'collaboration_request',
  // COLLABORATION_ACCEPTED = 'collaboration_accepted',
  // COLLABORATION_DECLINED = 'collaboration_declined',
  // TEAM_JOINED = 'team_joined',
  // TEAM_LEFT = 'team_left',
  
  // IDEA_SUBMITTED = 'idea_submitted',
  // IDEA_APPROVED = 'idea_approved',
  // IDEA_FEEDBACK = 'idea_feedback',
  // IDEA_FEATURED = 'idea_featured',
  
  EVENT_CREATED = 'event_created',
  EVENT_REMINDER = 'event_reminder',
  EVENT_UPDATED = 'event_updated',
  EVENT_CANCELLED = 'event_cancelled',
  
  RESOURCE_SHARED = 'resource_shared',
  RESOURCE_UPDATED = 'resource_updated',
  RESOURCE_COMMENT = 'resource_comment',
  
  PROFILE_UPDATED = 'profile_updated',
  ROLE_UPDATED = 'role_updated',
  MENTION = 'mention',
  TASK_ASSIGNED = 'task_assigned',
  TASK_DEADLINE = 'task_deadline',
  
  NEW_USER = 'new_user',
  USER_ROLE_UPDATED = 'user_role_updated',
  PLATFORM_UPDATE = 'platform_update',
  REPORT_GENERATED = 'report_generated',
  
  NEW_MESSAGE = 'new_message',
  COMMENT_REPLY = 'comment_reply',
  ANNOUNCEMENT = 'announcement',
  NEW_REMINDER = "NEW_REMINDER",
  SECURITY = "SECURITY",
  INFO = "INFO",
  
  // New chat-related notification types
  HUB_MESSAGE = 'hub_message',
  DIRECT_MESSAGE = 'direct_message',
  MESSAGE_MENTION = 'message_mention',
  MESSAGE_REACTION = 'message_reaction',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_EDITED = 'message_edited',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Interface for Notification attributes
 */
export interface NotificationAttributes {
  id?: string;
  userId: string;
  type: NotificationType;
  message: string;
  isRead?: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  priority?: NotificationPriority;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  // New chat-related fields
  senderId?: string;
  messageId?: string;
  roomId?: string;
}

/**
 * Interface for creating a new notification (optional attributes)
 */
export interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'isRead' | 'priority' | 'expiresAt' | 'createdAt' | 'updatedAt' | 'senderId' | 'messageId' | 'roomId'> {}

/**
 * Notification model definition
 */
export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: string;
  public userId!: string;
  public type!: NotificationType;
  public message!: string;
  public isRead!: boolean;
  public relatedEntityId?: string;
  public relatedEntityType?: string;
  public priority!: NotificationPriority;
  public expiresAt?: Date;
  public senderId?: string;
  public messageId?: string;
  public roomId?: string;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Notification.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'ID of the user who will receive this notification'
  },
  type: {
    type: DataTypes.ENUM(...Object.values(NotificationType)),
    allowNull: false,
    comment: 'Type of notification'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Notification message content'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether the notification has been read by the user'
  },
  relatedEntityId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the related entity (project, idea, event, etc.)'
  },
  relatedEntityType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Type of the related entity (Project, Idea, Event, etc.)'
  },
  priority: {
    type: DataTypes.ENUM(...Object.values(NotificationPriority)),
    defaultValue: NotificationPriority.MEDIUM,
    comment: 'Priority level of the notification'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when the notification should expire/be automatically removed'
  },
  // New chat-related fields
  senderId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the user who sent the message'
  },
  messageId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the related message'
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the related room (for hub messages)'
  }
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    // Improve query performance for common operations
    {
      name: 'notifications_user_read_idx',
      fields: ['userId', 'isRead']
    },
    {
      name: 'notifications_type_idx',
      fields: ['type']
    },
    {
      name: 'notifications_created_at_idx',
      fields: ['createdAt']
    }
    // Don't add the messageId index here - it will be added in the migration
  ]
});

// Define relationships with User model
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

export default Notification;