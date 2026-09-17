/**
 * Send Reason Utilities
 * Handles email notifications for account status changes
 * 
 * Last updated: 2025-07-01 15:33:07 UTC
 * Updated by: Alain275
 */

import { UserAttributes } from "../types/user.type";
import { sendEmail } from "./email.utils";
import { renderBrandedEmail } from "./emailTemplate.utils";
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
  
  // Status word is colored semantically (green/red for a positive/negative
  // outcome, same convention the app's own admin UI uses for active/inactive
  // badges) - everything else (header, reason box, CTA, links) uses the
  // brand navy uniformly, via renderBrandedEmail.
  const statusText = isActive ? "activated" : "deactivated";
  const statusColor = isActive ? "#1d7a50" : "#dc2626";

  // Support information
  const supportInfo = options.includeSupportInfo
    ? `<p>If you have any questions or need further assistance, please contact our support team at <a href="mailto:support@innovationhub.com" style="color: #002B56;">support@innovationhub.com</a>.</p>`
    : '';

  // Signature
  const signature = options.customSignature || 'Innovation Hub Team';

  // Generate HTML email body
  const htmlBody = renderBrandedEmail({
    previewText: `Your account has been ${statusText}.`,
    heading: "Account Status Update",
    bodyHtml: `
      <p>Dear ${userName},</p>
      <p>
        Your Innovation Hub account associated with the email
        <strong>${user.email}</strong>
        has been
        <strong style="color: ${statusColor};">${statusText}</strong>.
      </p>
      <div style="background-color: #f4f7fc; border-left: 4px solid #002B56; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0;">
          <strong>Reason:</strong>
          <span>${statusReason}</span>
        </p>
      </div>
      ${supportInfo}
      <p style="margin-top: 24px;">Best regards,<br>${signature}</p>
    `,
    ctaText: options.includeLoginLink && isActive ? "Sign In to Your Account" : undefined,
    ctaLink: options.includeLoginLink && isActive ? "https://innovationhub.com/login" : undefined,
  });

  // Generate plain text version for email clients that don't support HTML
  const textBody = `
Dear ${userName},

Your Innovation Hub account associated with the email ${user.email} has been ${statusText}.

Reason: ${statusReason}

${options.includeSupportInfo ? 'If you have any questions or need further assistance, please contact our support team at support@innovationhub.com.' : ''}
${options.includeLoginLink && isActive ? 'You can sign in to your account at: https://innovationhub.com/login' : ''}

Best regards,
${signature}

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Innovation Hub. All rights reserved.
  `;

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