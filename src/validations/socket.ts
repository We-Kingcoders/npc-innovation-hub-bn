import { Socket } from "socket.io";
import { NotificationType } from "../models/notification.modal";

/**
 * Innovation Hub - Socket.IO Validation Module
 * Created: 2025-07-01
 * Author: Innovation Hub Team
 */

/**
 * Validates the userId from socket connection
 * @param socket The socket instance
 * @returns The validated userId or null if invalid
 */
export const validateSocketUser = (socket: Socket): string | null => {
  const { userId } = socket.handshake.query as { userId?: string };
  
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return null;
  }
  
  // You might want to add more validation logic here
  // e.g., check if userId matches a specific format
  
  return userId;
};

/**
 * Validates a message payload
 * @param payload The message payload to validate
 * @returns Validation result with error messages if invalid
 */
export const validateMessage = (payload: unknown): { 
  valid: boolean; 
  data?: { to: string; content: string }; 
  error?: string 
} => {
  // Check if payload is an object
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: "Invalid message format" };
  }
  
  const data = payload as any;
  
  // Check required fields
  if (!data.to || typeof data.to !== 'string' || data.to.trim().length === 0) {
    return { valid: false, error: "Recipient ID is required" };
  }
  
  if (!data.content || typeof data.content !== 'string') {
    return { valid: false, error: "Message content is required" };
  }
  
  // Check content length
  if (data.content.trim().length === 0) {
    return { valid: false, error: "Message content cannot be empty" };
  }
  
  if (data.content.length > 5000) {
    return { valid: false, error: "Message content exceeds maximum length of 5000 characters" };
  }
  
  return {
    valid: true,
    data: {
      to: data.to,
      content: data.content
    }
  };
};

/**
 * Validates notification parameters
 * @param userId The recipient user ID
 * @param type The notification type
 * @param message The notification message
 * @param relatedEntityId Optional related entity ID
 * @returns Validation result
 */
export const validateNotificationParams = (
  userId: unknown,
  type: unknown,
  message: unknown,
  relatedEntityId?: unknown
): {
  valid: boolean;
  error?: string;
} => {
  // Validate userId
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return { valid: false, error: "Invalid user ID" };
  }
  
  // Validate notification type
  if (!type || !Object.values(NotificationType).includes(type as NotificationType)) {
    return { valid: false, error: "Invalid notification type" };
  }
  
  // Validate message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return { valid: false, error: "Invalid notification message" };
  }
  
  // Validate relatedEntityId if provided
  if (relatedEntityId !== undefined && 
     (typeof relatedEntityId !== 'string' || relatedEntityId.trim().length === 0)) {
    return { valid: false, error: "Invalid related entity ID" };
  }
  
  return { valid: true };
};

/**
 * Sends a notification with validation
 * @param userId The recipient user ID
 * @param type The notification type
 * @param message The notification message
 * @param relatedEntityId Optional related entity ID
 * @returns Whether the notification was sent
 */
export const sendNotification = (
  userId: string,
  type: NotificationType,
  message: string,
  relatedEntityId?: string
): boolean => {
  // Validate parameters
  const validation = validateNotificationParams(userId, type, message, relatedEntityId);
  
  if (!validation.valid) {
    console.error(`Failed to send notification: ${validation.error}`);
    return false;
  }
  
  // If valid, import and use the actual notification sender
  try {
    const { sendNotification: actualSendNotification } = require('../socket');
    actualSendNotification(userId, type, message, relatedEntityId);
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

/**
 * Validates a notification ID
 * @param notificationId The notification ID to validate
 * @returns Validation result
 */
export const validateNotificationId = (notificationId: unknown): {
  valid: boolean;
  data?: string;
  error?: string;
} => {
  if (!notificationId || typeof notificationId !== 'string' || notificationId.trim().length === 0) {
    return { valid: false, error: "Invalid notification ID" };
  }
  
  // You may add additional validation for your ID format
  // For example, if IDs are MongoDB ObjectIds:
  // const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  // if (!objectIdPattern.test(notificationId)) {
  //   return { valid: false, error: "Invalid notification ID format" };
  // }
  
  return { valid: true, data: notificationId };
};

/**
 * Validates a room name for Socket.IO room operations
 * @param room The room name to validate
 * @returns Whether the room name is valid
 */
export const validateRoomName = (room: unknown): boolean => {
  return typeof room === 'string' && room.trim().length > 0;
};

/**
 * Checks if an event name is a valid Socket.IO event in our application
 * @param eventName The event name to validate
 * @returns Whether the event name is valid
 */
export const isValidEventName = (eventName: string): boolean => {
  const validEvents = [
    'connection',
    'disconnect',
    'send_message',
    'receive_message',
    'mark_read',
    'notifications_update',
    'new_notification',
    'error'
  ];
  
  return validEvents.includes(eventName);
};

/**
 * Socket middleware for validating connections
 * @param socket The socket instance
 * @param next The next middleware function
 */
export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  const userId = validateSocketUser(socket);
  
  if (!userId) {
    return next(new Error('Authentication failed: Invalid user ID'));
  }
  
  // You can add additional auth checks here
  // For example, verify a token:
  // const { token } = socket.handshake.auth as { token?: string };
  // if (!token || !verifyToken(token, userId)) {
  //   return next(new Error('Authentication failed: Invalid token'));
  // }
  
  // Attach userId to socket for later use
  (socket as any).userId = userId;
  next();
};

/**
 * Utility function to apply validation to a socket event handler
 * @param validator The validation function
 * @param handler The event handler function
 * @returns A wrapped handler with validation
 */
export const withValidation = <T>(
  validator: (data: unknown) => { valid: boolean; data?: T; error?: string },
  handler: (data: T, socket: Socket) => void
) => {
  return (rawData: unknown, socket: Socket) => {
    const result = validator(rawData);
    
    if (!result.valid) {
      return socket.emit('error', { message: result.error });
    }
    
    handler(result.data as T, socket);
  };
};