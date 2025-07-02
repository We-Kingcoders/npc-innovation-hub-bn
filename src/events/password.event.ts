/**
 * Password Events Utility
 * Event-driven system for password-related actions in Innovation Hub
 * 
 * Last updated: 2025-07-01 15:38:10 UTC
 * Updated by: Alain275
 */

import { EventEmitter } from 'events';
import { UserService } from '../services/user.services';
import { sendTemplateEmail, EmailTemplate } from '../utils/email.utils';

// Define event names as constants for type safety
export const PASSWORD_EVENTS = {
  UPDATED: 'passwordUpdated',
  RESET_REQUESTED: 'passwordResetRequested',
  RESET_COMPLETED: 'passwordResetCompleted',
  EXPIRED: 'passwordExpired',
  FAILED_ATTEMPT: 'passwordFailedAttempt',
  LOCKED: 'accountLocked'
};

// Create and export the event emitter
export const passwordEventEmitter = new EventEmitter();

// Set maximum listeners to avoid memory leaks
passwordEventEmitter.setMaxListeners(20);

// Define the type for the failed attempt tracking
interface FailedAttemptTracker {
  [userId: string]: {
    count: number;
    firstAttempt: Date;
  };
}

// Track failed password attempts
const failedAttempts: FailedAttemptTracker = {};

// Maximum failed attempts before triggering account lock
const MAX_FAILED_ATTEMPTS = 5;

// Time window for failed attempts in milliseconds (30 minutes)
const FAILED_ATTEMPT_WINDOW = 30 * 60 * 1000;

/**
 * Event Handler: Password Updated
 * Updates the user's updatedAt timestamp when password is changed
 */
passwordEventEmitter.on(PASSWORD_EVENTS.UPDATED, async (userId: string) => {
  try {
    console.log(`[2025-07-01 15:38:10] Password update event for user ${userId} handled by Alain275`);
    
    const user = await UserService.getUserByid(userId);
    if (user) {
      user.updatedAt = new Date();
      await user.save();
      
      // Clear any failed attempts
      if (failedAttempts[userId]) {
        delete failedAttempts[userId];
      }
      
      console.log(`[2025-07-01 15:38:10] User ${userId} timestamp updated after password change`);
    } else {
      console.warn(`[2025-07-01 15:38:10] User ${userId} not found when updating password timestamp`);
    }
  } catch (error) {
    console.error(`[2025-07-01 15:38:10] Error handling password update for user ${userId}:`, error);
  }
});

/**
 * Event Handler: Password Reset Requested
 * Sends a password reset email to the user
 */
passwordEventEmitter.on(PASSWORD_EVENTS.RESET_REQUESTED, async (userId: string, resetToken: string, resetLink: string) => {
  try {
    console.log(`[2025-07-01 15:38:10] Password reset requested for user ${userId}`);
    
    const user = await UserService.getUserByid(userId);
    if (user && user.email) {
      await sendTemplateEmail(
        user.email,
        EmailTemplate.PASSWORD_RESET,
        {
          firstName: user.firstName || 'User',
          resetLink: resetLink
        }
      );
      
      console.log(`[2025-07-01 15:38:10] Password reset email sent to user ${userId}`);
    } else {
      console.warn(`[2025-07-01 15:38:10] User ${userId} not found or missing email for password reset`);
    }
  } catch (error) {
    console.error(`[2025-07-01 15:38:10] Error sending password reset email for user ${userId}:`, error);
  }
});

/**
 * Event Handler: Password Reset Completed
 * Updates user record and sends confirmation email
 */
passwordEventEmitter.on(PASSWORD_EVENTS.RESET_COMPLETED, async (userId: string) => {
  try {
    console.log(`[2025-07-01 15:38:10] Password reset completed for user ${userId}`);
    
    const user = await UserService.getUserByid(userId);
    if (user && user.email) {
      user.updatedAt = new Date();
      await user.save();
      
      // Send confirmation email
      await sendTemplateEmail(
        user.email,
        EmailTemplate.PASSWORD_RESET,
        {
          firstName: user.firstName || 'User',
          message: 'Your password has been successfully reset. If you did not make this change, please contact support immediately.'
        }
      );
      
      console.log(`[2025-07-01 15:38:10] Password reset completion email sent to user ${userId}`);
    }
  } catch (error) {
    console.error(`[2025-07-01 15:38:10] Error handling password reset completion for user ${userId}:`, error);
  }
});

/**
 * Event Handler: Failed Password Attempt
 * Tracks failed attempts and may trigger account lock
 */
passwordEventEmitter.on(PASSWORD_EVENTS.FAILED_ATTEMPT, async (userId: string, ipAddress: string = 'unknown') => {
  try {
    console.log(`[2025-07-01 15:38:10] Failed password attempt for user ${userId} from IP ${ipAddress}`);
    
    const now = new Date();
    
    // Initialize tracking if it doesn't exist
    if (!failedAttempts[userId]) {
      failedAttempts[userId] = {
        count: 0,
        firstAttempt: now
      };
    }
    
    // Check if we're outside the time window and should reset
    if (now.getTime() - failedAttempts[userId].firstAttempt.getTime() > FAILED_ATTEMPT_WINDOW) {
      failedAttempts[userId] = {
        count: 1,
        firstAttempt: now
      };
      return;
    }
    
    // Increment the counter
    failedAttempts[userId].count++;
    
    // Check if we've reached the maximum attempts
    if (failedAttempts[userId].count >= MAX_FAILED_ATTEMPTS) {
      // Trigger account lock
      passwordEventEmitter.emit(PASSWORD_EVENTS.LOCKED, userId, ipAddress);
    }
  } catch (error) {
    console.error(`[2025-07-01 15:38:10] Error handling failed password attempt for user ${userId}:`, error);
  }
});

/**
 * Event Handler: Account Locked
 * Temporarily locks an account after too many failed attempts
 */
passwordEventEmitter.on(PASSWORD_EVENTS.LOCKED, async (userId: string, ipAddress: string = 'unknown') => {
  try {
    console.log(`[2025-07-01 15:38:10] Account locked for user ${userId} due to multiple failed attempts from IP ${ipAddress}`);
    
    const user = await UserService.getUserByid(userId);
    if (user && user.email) {
      // Temporarily deactivate the account
      user.isActive = false;
      await user.save();
      
      // Send notification email
      await sendTemplateEmail(
        user.email,
        EmailTemplate.ACCOUNT_DEACTIVATION,
        {
          firstName: user.firstName || 'User',
          message: 'Your account has been temporarily locked due to multiple failed login attempts. Please reset your password or contact support to unlock your account.'
        }
      );
      
      console.log(`[2025-07-01 15:38:10] Account lock notification sent to user ${userId}`);
    }
  } catch (error) {
    console.error(`[2025-07-01 15:38:10] Error handling account lock for user ${userId}:`, error);
  }
});

/**
 * Reset the failed attempts counter for a user
 * @param userId User ID to reset counters for
 */
export const resetFailedAttempts = (userId: string): void => {
  if (failedAttempts[userId]) {
    delete failedAttempts[userId];
    console.log(`[2025-07-01 15:38:10] Failed attempts counter reset for user ${userId}`);
  }
};

/**
 * Get the current failed attempt count for a user
 * @param userId User ID to check
 * @returns Number of recent failed attempts, or 0 if none
 */
export const getFailedAttemptCount = (userId: string): number => {
  if (!failedAttempts[userId]) return 0;
  
  const now = new Date();
  
  // Check if we're outside the time window
  if (now.getTime() - failedAttempts[userId].firstAttempt.getTime() > FAILED_ATTEMPT_WINDOW) {
    delete failedAttempts[userId];
    return 0;
  }
  
  return failedAttempts[userId].count;
};

// Log module initialization
console.log(`[2025-07-01 15:38:10] Password event system initialized by Alain275`);