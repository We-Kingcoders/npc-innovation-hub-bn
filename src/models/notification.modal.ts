/**
 * Notification Model
 * Manages notification records for the Innovation Hub platform
 * 
 * Last updated: 2025-07-01 15:44:12 UTC
 * Updated by: Alain275
 */

import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Notification types for Innovation Hub activities
 */
export enum NotificationType {
  // Project notifications
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_MILESTONE = 'project_milestone',
  PROJECT_COMPLETED = 'project_completed',
  PROJECT_FEEDBACK = 'project_feedback',
  
  // Collaboration notifications
  COLLABORATION_REQUEST = 'collaboration_request',
  COLLABORATION_ACCEPTED = 'collaboration_accepted',
  COLLABORATION_DECLINED = 'collaboration_declined',
  TEAM_JOINED = 'team_joined',
  TEAM_LEFT = 'team_left',
  
  // Idea notifications
  IDEA_SUBMITTED = 'idea_submitted',
  IDEA_APPROVED = 'idea_approved',
  IDEA_FEEDBACK = 'idea_feedback',
  IDEA_FEATURED = 'idea_featured',
  
  // Event notifications
  EVENT_CREATED = 'event_created',
  EVENT_REMINDER = 'event_reminder',
  EVENT_UPDATED = 'event_updated',
  EVENT_CANCELLED = 'event_cancelled',
  
  // Resource notifications
  RESOURCE_SHARED = 'resource_shared',
  RESOURCE_UPDATED = 'resource_updated',
  RESOURCE_COMMENT = 'resource_comment',
  
  // User notifications
  PROFILE_UPDATED = 'profile_updated',
  ROLE_UPDATED = 'role_updated',
  MENTION = 'mention',
  TASK_ASSIGNED = 'task_assigned',
  TASK_DEADLINE = 'task_deadline',
  
  // Admin notifications
  NEW_USER = 'new_user',
  USER_ROLE_UPDATED = 'user_role_updated',
  PLATFORM_UPDATE = 'platform_update',
  REPORT_GENERATED = 'report_generated',
  
  // Communication notifications
  NEW_MESSAGE = 'new_message',
  COMMENT_REPLY = 'comment_reply',
  ANNOUNCEMENT = 'announcement',
  NEW_REMINDER = "NEW_REMINDER",
  SECURITY = "SECURITY",
  INFO = "INFO",
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
}

/**
 * Interface for creating a new notification (optional attributes)
 */
export interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'isRead' | 'priority' | 'expiresAt' | 'createdAt' | 'updatedAt'> {}

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
  ]
});

// Comment to identify file update
console.log(`[2025-07-01 15:44:12] Notification model initialized by Alain275`);

export default Notification;