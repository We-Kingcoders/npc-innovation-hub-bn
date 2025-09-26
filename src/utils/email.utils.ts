/**
 * Email Utilities
 * Handles all email communication for Innovation Hub
 * 
 * Last updated: 2025-09-26 20:42:00 UTC
 * Updated by: Copilot
 */

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { SentMessageInfo } from "nodemailer/lib/smtp-transport";

dotenv.config();

// Primary transporter
let primaryTransporter: nodemailer.Transporter;
// Fallback transporter
let fallbackTransporter: nodemailer.Transporter;

// Flag to track if transporters are initialized
let primaryTransporterReady = false;
let fallbackTransporterReady = false;
let primaryTransporterFailed = false;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RECONNECT_INTERVAL = 30000; // 30 seconds

// Initialize primary transporter (Gmail)
try {
  primaryTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    // Add connection timeout (default is too high)
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,    // 5 seconds
    socketTimeout: 10000      // 10 seconds
  });

  // Verify connection
  primaryTransporter.verify((error) => {
    if (error) {
      console.error(`[${new Date().toISOString()}] Primary SMTP connection error:`, error);
      primaryTransporterFailed = true;
      // Schedule reconnection attempts
      scheduleReconnection();
    } else {
      console.log(`[${new Date().toISOString()}] Primary SMTP server is ready`);
      primaryTransporterReady = true;
    }
  });
} catch (err) {
  console.error(`[${new Date().toISOString()}] Failed to create primary email transporter:`, err);
  primaryTransporterFailed = true;
}

// Setup fallback (Ethereal) transporter for when Gmail fails
setupFallbackTransporter();

// Function to set up fallback transporter
async function setupFallbackTransporter(): Promise<void> {
  try {
    const testAccount = await nodemailer.createTestAccount();
    
    fallbackTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    fallbackTransporterReady = true;
    console.log(`[${new Date().toISOString()}] Fallback (Ethereal) email configured`);
    console.log(`[${new Date().toISOString()}] Credentials: ${testAccount.user} / ${testAccount.pass}`);
    console.log(`[${new Date().toISOString()}] View emails at: https://ethereal.email`);
    
    // Verify connection
    fallbackTransporter.verify((error) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] Fallback SMTP connection error:`, error);
        fallbackTransporterReady = false;
      } else {
        console.log(`[${new Date().toISOString()}] Fallback SMTP server is ready`);
      }
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Failed to create fallback email transporter:`, err);
    fallbackTransporterReady = false;
  }
}

// Function to attempt reconnection to primary SMTP server
function scheduleReconnection(): void {
  console.log(`[${new Date().toISOString()}] Scheduling primary SMTP reconnection in ${RECONNECT_INTERVAL/1000} seconds...`);
  setTimeout(() => {
    console.log(`[${new Date().toISOString()}] Attempting to reconnect primary email service...`);
    
    primaryTransporter.verify((error) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] Primary SMTP connection error:`, error);
        primaryTransporterFailed = true;
        primaryTransporterReady = false;
        // Schedule another reconnection
        scheduleReconnection();
      } else {
        console.log(`[${new Date().toISOString()}] Primary SMTP server reconnected successfully`);
        primaryTransporterFailed = false;
        primaryTransporterReady = true;
      }
    });
  }, RECONNECT_INTERVAL);
}

// Define email interface for type safety
interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path: string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
}

// Email template names
export enum EmailTemplate {
  WELCOME = 'welcome',
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password-reset',
  ACCOUNT_ACTIVATION = 'account-activation',
  ACCOUNT_DEACTIVATION = 'account-deactivation',
  EVENT_INVITATION = 'event-invitation',
  ROLE_UPDATE = 'role-update',
}

// Track email sending rate for throttling
const emailSendLog: Record<string, number[]> = {};
const MAX_EMAILS_PER_HOUR = 20;

/**
 * Send an email with retry and fallback logic
 * @param to Recipient email address(es)
 * @param subject Email subject
 * @param text Plain text email body
 * @param html HTML email body
 * @returns Promise resolving to send info
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  text?: string,
  html?: string,
  retryCount = 0
): Promise<SentMessageInfo> {
  // Check if any transporter is ready
  if (!primaryTransporterReady && !fallbackTransporterReady) {
    console.log(`[${new Date().toISOString()}] Waiting for email transporter to initialize...`);
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (!primaryTransporterReady && !fallbackTransporterReady) {
      if (retryCount < MAX_RETRIES) {
        console.log(`[${new Date().toISOString()}] No email transporter available. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        return sendEmail(to, subject, text, html, retryCount + 1);
      }
      throw new Error('Email transport not initialized after multiple attempts.');
    }
  }
  
  // Basic rate limiting
  const recipient = Array.isArray(to) ? to[0] : to;
  const now = Date.now();
  if (!emailSendLog[recipient]) {
    emailSendLog[recipient] = [];
  }
  
  // Remove timestamps older than 1 hour
  emailSendLog[recipient] = emailSendLog[recipient].filter(
    timestamp => now - timestamp < 3600000
  );
  
  // Check if rate limit exceeded
  if (emailSendLog[recipient].length >= MAX_EMAILS_PER_HOUR) {
    console.warn(`[${new Date().toISOString()}] Rate limit exceeded for recipient: ${recipient}`);
    throw new Error(`Email rate limit exceeded for this recipient (${MAX_EMAILS_PER_HOUR} per hour)`);
  }
  
  // Log email sending timestamp
  emailSendLog[recipient].push(now);
  
  const mailOptions = {
    from: `"Innovation Hub" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    text: text,
    html: html,
  };

  try {
    // Choose the appropriate transporter
    let transporter: nodemailer.Transporter;
    let transporterType: string;
    
    if (primaryTransporterReady && !primaryTransporterFailed) {
      transporter = primaryTransporter;
      transporterType = "primary";
    } else if (fallbackTransporterReady) {
      transporter = fallbackTransporter;
      transporterType = "fallback";
      console.log(`[${new Date().toISOString()}] Using fallback email service for: ${Array.isArray(to) ? to.join(', ') : to}`);
    } else {
      throw new Error("No email transporter available");
    }
    
    console.log(`[${new Date().toISOString()}] Sending email to: ${Array.isArray(to) ? to.join(', ') : to} (Attempt ${retryCount + 1})`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[${new Date().toISOString()}] Email sent: ${info.messageId}`);
    
    // For Ethereal emails, provide the preview URL
    if (transporterType === "fallback" && info.messageId) {
      console.log(`[${new Date().toISOString()}] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error: unknown) {
    // Type guard for error
    const err = error as Error;
    
    console.error(`[${new Date().toISOString()}] Error sending email:`, err);
    
    // Handle specific error cases
    if (err.message && err.message.includes('ETIMEDOUT') && retryCount < MAX_RETRIES) {
      console.log(`[${new Date().toISOString()}] Connection timeout. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      
      // If using primary transporter, mark it as failed for this attempt
      if (!primaryTransporterFailed) {
        primaryTransporterFailed = true;
        // Schedule reconnection
        scheduleReconnection();
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Retry with incremented retry count
      return sendEmail(to, subject, text, html, retryCount + 1);
    }
    
    // If we're using the primary transporter and it failed, try the fallback
    if (!primaryTransporterFailed && primaryTransporterReady && fallbackTransporterReady && retryCount < MAX_RETRIES) {
      console.log(`[${new Date().toISOString()}] Primary email service failed. Switching to fallback...`);
      primaryTransporterFailed = true;
      // Schedule reconnection
      scheduleReconnection();
      
      // Wait before retry with fallback
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Retry with fallback
      return sendEmail(to, subject, text, html, retryCount + 1);
    }
    
    throw err;
  }
}

/**
 * Send an email with attachments
 * @param options Email options including attachments
 * @returns Promise resolving to send info
 */
export async function sendEmailWithAttachments(options: EmailOptions, retryCount = 0): Promise<SentMessageInfo> {
  // Check if any transporter is ready
  if (!primaryTransporterReady && !fallbackTransporterReady) {
    console.log(`[${new Date().toISOString()}] Waiting for email transporter to initialize...`);
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (!primaryTransporterReady && !fallbackTransporterReady) {
      if (retryCount < MAX_RETRIES) {
        console.log(`[${new Date().toISOString()}] No email transporter available. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        return sendEmailWithAttachments(options, retryCount + 1);
      }
      throw new Error('Email transport not initialized after multiple attempts.');
    }
  }
  
  const mailOptions = {
    from: `"Innovation Hub" <${process.env.EMAIL_USER}>`,
    ...options
  };

  try {
    // Choose the appropriate transporter
    let transporter: nodemailer.Transporter;
    let transporterType: string;
    
    if (primaryTransporterReady && !primaryTransporterFailed) {
      transporter = primaryTransporter;
      transporterType = "primary";
    } else if (fallbackTransporterReady) {
      transporter = fallbackTransporter;
      transporterType = "fallback";
      console.log(`[${new Date().toISOString()}] Using fallback email service for: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    } else {
      throw new Error("No email transporter available");
    }
    
    console.log(`[${new Date().toISOString()}] Sending email with attachments to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to} (Attempt ${retryCount + 1})`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[${new Date().toISOString()}] Email with attachments sent: ${info.messageId}`);
    
    // For Ethereal emails, provide the preview URL
    if (transporterType === "fallback" && info.messageId) {
      console.log(`[${new Date().toISOString()}] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error: unknown) {
    // Type guard for error
    const err = error as Error;
    
    console.error(`[${new Date().toISOString()}] Error sending email with attachments:`, err);
    
    // Handle specific error cases
    if (err.message && err.message.includes('ETIMEDOUT') && retryCount < MAX_RETRIES) {
      console.log(`[${new Date().toISOString()}] Connection timeout. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      
      // If using primary transporter, mark it as failed for this attempt
      if (!primaryTransporterFailed) {
        primaryTransporterFailed = true;
        // Schedule reconnection
        scheduleReconnection();
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Retry with incremented retry count
      return sendEmailWithAttachments(options, retryCount + 1);
    }
    
    // If we're using the primary transporter and it failed, try the fallback
    if (!primaryTransporterFailed && primaryTransporterReady && fallbackTransporterReady && retryCount < MAX_RETRIES) {
      console.log(`[${new Date().toISOString()}] Primary email service failed. Switching to fallback...`);
      primaryTransporterFailed = true;
      // Schedule reconnection
      scheduleReconnection();
      
      // Wait before retry with fallback
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Retry with fallback
      return sendEmailWithAttachments(options, retryCount + 1);
    }
    
    throw err;
  }
}

/**
 * Send an email using a template
 * @param to Recipient email address(es)
 * @param template Template name
 * @param data Data to populate the template
 * @returns Promise resolving to send info
 */
export async function sendTemplateEmail(
  to: string | string[],
  template: EmailTemplate,
  data: Record<string, any>
): Promise<SentMessageInfo> {
  // Default data values
  const defaultData = {
    appName: 'Innovation Hub',
    supportEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
    year: new Date().getFullYear(),
    ...data,
  };

  let subject = '';
  let text = '';
  let html = '';

  // Generate email content based on template
  switch (template) {
    case EmailTemplate.WELCOME:
      subject = `Welcome to Innovation Hub, ${data.firstName}!`;
      text = `
Dear ${data.firstName},

Welcome to Innovation Hub! We're excited to have you join our community of innovators and creators.

Your account has been created successfully. You can now log in and start exploring our platform.

Best regards,
The Innovation Hub Team
      `;
      html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">Welcome to Innovation Hub!</h2>
  <p>Dear ${data.firstName},</p>
  <p>We're excited to have you join our community of innovators and creators.</p>
  <p>Your account has been created successfully. You can now log in and start exploring our platform.</p>
  <p>Best regards,<br>The Innovation Hub Team</p>
</div>
      `;
      break;

    case EmailTemplate.VERIFICATION:
      subject = 'Innovation Hub - Verify Your Email';
      text = `
Dear ${data.firstName},

Please verify your email address by clicking the link below:

${data.verificationLink}

If you did not create an account with us, please disregard this message.

Best regards,
The Innovation Hub Team
      `;
      html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">Email Verification</h2>
  <p>Dear ${data.firstName},</p>
  <p>Please verify your email address by clicking the button below:</p>
  <p>
    <a href="${data.verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: #ffffff; text-decoration: none; border-radius: 4px;">
      Verify Email
    </a>
  </p>
  <p>If you did not create an account with us, please disregard this message.</p>
  <p>Best regards,<br>The Innovation Hub Team</p>
</div>
      `;
      break;

    case EmailTemplate.PASSWORD_RESET:
      subject = 'Innovation Hub - Password Reset Request';
      text = `
Dear ${data.firstName},

We received a request to reset your password. Please click the link below to set a new password:

${data.resetLink}

If you did not request a password reset, please ignore this email.

Best regards,
The Innovation Hub Team
      `;
      html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">Password Reset Request</h2>
  <p>Dear ${data.firstName},</p>
  <p>We received a request to reset your password. Please click the button below to set a new password:</p>
  <p>
    <a href="${data.resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #e74c3c; color: #ffffff; text-decoration: none; border-radius: 4px;">
      Reset Password
    </a>
  </p>
  <p>If you did not request a password reset, please ignore this email.</p>
  <p>Best regards,<br>The Innovation Hub Team</p>
</div>
      `;
      break;

    case EmailTemplate.ROLE_UPDATE:
      subject = 'Innovation Hub - Role Update';
      text = `
Dear ${data.firstName},

Your role on the Innovation Hub platform has been updated to ${data.newRole}.

${data.message || ''}

If you have any questions, please contact our support team.

Best regards,
The Innovation Hub Team
      `;
      html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">Role Update</h2>
  <p>Dear ${data.firstName},</p>
  <p>Your role on the Innovation Hub platform has been updated to <strong>${data.newRole}</strong>.</p>
  ${data.message ? `<p>${data.message}</p>` : ''}
  <p>If you have any questions, please contact our support team.</p>
  <p>Best regards,<br>The Innovation Hub Team</p>
</div>
      `;
      break;

    case EmailTemplate.EVENT_INVITATION:
      subject = `Innovation Hub - Invitation: ${data.eventName}`;
      text = `
Dear ${data.firstName},

You're invited to join our event: ${data.eventName}

Date: ${data.eventDate}
Time: ${data.eventTime}
${data.eventLocation ? `Location: ${data.eventLocation}` : ''}
${data.eventLink ? `Link: ${data.eventLink}` : ''}

${data.eventDescription || ''}

We hope to see you there!

Best regards,
The Innovation Hub Team
      `;
      html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">You're Invited!</h2>
  <p>Dear ${data.firstName},</p>
  <p>You're invited to join our event: <strong>${data.eventName}</strong></p>
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
    <p><strong>Date:</strong> ${data.eventDate}</p>
    <p><strong>Time:</strong> ${data.eventTime}</p>
    ${data.eventLocation ? `<p><strong>Location:</strong> ${data.eventLocation}</p>` : ''}
    ${data.eventLink ? `<p><strong>Link:</strong> <a href="${data.eventLink}">${data.eventLink}</a></p>` : ''}
  </div>
  ${data.eventDescription ? `<p>${data.eventDescription}</p>` : ''}
  <p>We hope to see you there!</p>
  <p>Best regards,<br>The Innovation Hub Team</p>
</div>
      `;
      break;

    default:
      throw new Error(`Email template '${template}' not found`);
  }

  return sendEmail(to, subject, text, html);
}

// Log module initialization
console.log(`[${new Date().toISOString()}] Email utils initialized`);

export {
  sendEmail,
  sendEmailWithAttachments,
  sendTemplateEmail,
  EmailTemplate
};