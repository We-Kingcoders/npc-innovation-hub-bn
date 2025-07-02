/**
 * Send Reason Utilities
 * Handles email notifications for account status changes
 * 
 * Last updated: 2025-07-01 15:33:07 UTC
 * Updated by: Alain275
 */

import { UserAttributes } from "../types/user.type";
import { sendEmail } from "./email.utils";
import { AccountStatusMessages } from "./variable.utils";

/**
 * Options for customizing the account status email
 */
interface StatusEmailOptions {
  customSubject?: string;
  customSignature?: string;
  includeSupportInfo?: boolean;
  includeLoginLink?: boolean;
  highPriority?: boolean;
}

/**
 * Send an email to a user explaining the reason for an account status change
 * @param user User to send email to
 * @param subject Email subject
 * @param statusReason Reason for the status change
 * @param isActive New account status (true for active, false for inactive)
 * @param options Additional email customization options
 * @returns Promise resolving when email is sent
 */
export const sendReasonEmail = async (
  user: UserAttributes,
  subject: string,
  statusReason: string,
  isActive: boolean,
  options: StatusEmailOptions = {}
): Promise<void> => {
  // Get user's full name or fallback to email if name not available
  const userName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.email;
  
  // Set status text and colors
  const statusText = isActive ? "activated" : "deactivated";
  const statusColor = isActive ? "#28a745" : "#dc3545"; // Green for active, red for inactive
  
  // Support information
  const supportInfo = options.includeSupportInfo 
    ? `<p style="font-size: 16px; color: #444;">If you have any questions or need further assistance, please contact our support team at <a href="mailto:support@innovationhub.com" style="color: #007bff;">support@innovationhub.com</a>.</p>`
    : '';
  
  // Login link
  const loginLink = options.includeLoginLink && isActive
    ? `<p style="font-size: 16px; margin-top: 20px;"><a href="https://innovationhub.com/login" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">Login to your account</a></p>`
    : '';
  
  // Signature
  const signature = options.customSignature || 'Innovation Hub Team';
  
  // Generate HTML email body
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #007bff;">Account Status Update</h2>
      </div>
      
      <p style="font-size: 16px; color: #444;">Dear ${userName},</p>
      
      <p style="font-size: 16px; color: #444;">
        Your Innovation Hub account associated with the email 
        <strong style="color: #000;">${user.email}</strong> 
        has been 
        <strong style="color: ${statusColor};">
          ${statusText}
        </strong>.
      </p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
        <p style="font-size: 16px; color: #444; margin: 0;">
          <strong>Reason:</strong> 
          <span style="color: #007bff;">${statusReason}</span>
        </p>
      </div>
      
      ${loginLink}
      ${supportInfo}
      
      <p style="font-size: 16px; color: #444; margin-top: 30px;">Best regards,</p>
      <p style="font-size: 16px; color: #444;">${signature}</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center;">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>© ${new Date().getFullYear()} Innovation Hub. All rights reserved.</p>
      </div>
    </div>
  `;

  // Generate plain text version for email clients that don't support HTML
  const textBody = `
Dear ${userName},

Your Innovation Hub account associated with the email ${user.email} has been ${statusText}.

Reason: ${statusReason}

${options.includeSupportInfo ? 'If you have any questions or need further assistance, please contact our support team at support@innovationhub.com.' : ''}
${options.includeLoginLink && isActive ? 'You can login to your account at: https://innovationhub.com/login' : ''}

Best regards,
${signature}

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Innovation Hub. All rights reserved.
  `;

  // Set email priority headers if needed
  const emailOptions = options.highPriority ? { 
    priority: 'high',
    headers: { 'X-Priority': '1', 'Importance': 'high' }
  } : {};

  try {
    console.log(`[${new Date().toISOString()}] Sending account ${statusText} email to: ${user.email}`);
    
    if (!user.email) {
      throw new Error("User email is required to send an email.");
    }
    await sendEmail(
      user.email, 
      options.customSubject || subject, 
      textBody, 
      htmlBody
    );
    
    console.log(`[${new Date().toISOString()}] Account ${statusText} email sent successfully to: ${user.email}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send account ${statusText} email to ${user.email}:`, error);
    throw error;
  }
};

/**
 * Convenience method to send account activation email
 * @param user User to send email to
 * @param reason Reason for activation
 * @param options Additional email options
 */
export const sendActivationEmail = async (
  user: UserAttributes,
  reason: string = AccountStatusMessages.DEFAULT_ACTIVATION_REASON,
  options: StatusEmailOptions = {}
): Promise<void> => {
  return sendReasonEmail(
    user,
    options.customSubject || AccountStatusMessages.ACCOUNT_ENABLED_SUBJECT,
    reason,
    true, // isActive = true
    { includeSupportInfo: true, includeLoginLink: true, ...options }
  );
};

/**
 * Convenience method to send account deactivation email
 * @param user User to send email to
 * @param reason Reason for deactivation
 * @param options Additional email options
 */
export const sendDeactivationEmail = async (
  user: UserAttributes,
  reason: string,
  options: StatusEmailOptions = {}
): Promise<void> => {
  return sendReasonEmail(
    user,
    options.customSubject || AccountStatusMessages.ACCOUNT_DISABLED_SUBJECT,
    reason,
    false, // isActive = false
    { includeSupportInfo: true, ...options }
  );
};

// Log module initialization
console.log(`[2025-07-01 15:33:07] SendReason utils initialized by Alain275`);