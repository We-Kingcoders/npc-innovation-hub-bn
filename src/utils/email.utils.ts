/**
 * Email Utilities
 * Handles all email communication for Innovation Hub
 * 
 * Last updated: 2025-09-26 20:21:32 UTC
 * Updated by: shemaalain2025-cloud
 */

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { SentMessageInfo, Options } from "nodemailer/lib/smtp-transport";

dotenv.config();

// Connection retry settings
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // ms

// Track connection status
let primaryEmailAvailable = true;
let transporterInitialized = false;
let fallbackTransporterInitialized = false;

// Primary transporter
let transporter: nodemailer.Transporter<SentMessageInfo, Options>;

// Fallback transporter for when primary fails
let fallbackTransporter: nodemailer.Transporter<SentMessageInfo, Options>;

// Initialize primary transporter with improved settings
function initializePrimaryTransporter() {
  try {
    // Configure primary transporter with better timeout and connection settings
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // 10 seconds instead of default
      socketTimeout: 30000, // 30 seconds
      pool: true, // Use connection pooling
      maxConnections: 5, // Maximum number of connections
      maxMessages: 100 // Maximum number of messages per connection
    });

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] Primary SMTP connection error:`, error);
        primaryEmailAvailable = false;
      } else {
        console.log(`[${new Date().toISOString()}] Primary SMTP server is ready`);
        primaryEmailAvailable = true;
        transporterInitialized = true;
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error initializing primary email transport:`, error);
    primaryEmailAvailable = false;
  }
}

// Initialize fallback transporter
function initializeFallbackTransporter() {
  try {
    // Check if SendGrid credentials are available as fallback
    if (process.env.SENDGRID_API_KEY) {
      fallbackTransporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      // Mailgun as another alternative
      fallbackTransporter = nodemailer.createTransport({
        service: 'Mailgun',
        auth: {
          user: process.env.MAILGUN_USER || 'api',
          pass: process.env.MAILGUN_API_KEY
        },
        host: 'api.mailgun.net',
        secure: false
      });
    } else {
      // If no API-based services are available, create an Ethereal account as last resort
      nodemailer.createTestAccount().then(testAccount => {
        fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        fallbackTransporterInitialized = true;
        console.log(`[${new Date().toISOString()}] Fallback (Ethereal) email configured`);
        console.log(`[${new Date().toISOString()}] Credentials: ${testAccount.user} / ${testAccount.pass}`);
        console.log(`[${new Date().toISOString()}] View emails at: https://ethereal.email`);
      }).catch(err => {
        console.error(`[${new Date().toISOString()}] Failed to create fallback email account:`, err);
      });
      return;
    }

    // Verify fallback connection
    fallbackTransporter.verify((error, success) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] Fallback SMTP connection error:`, error);
      } else {
        console.log(`[${new Date().toISOString()}] Fallback SMTP server is ready`);
        fallbackTransporterInitialized = true;
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error initializing fallback email transport:`, error);
  }
}

// Initialize both transporters
initializePrimaryTransporter();
initializeFallbackTransporter();

// Schedule periodic health checks for the primary email service
setInterval(() => {
  if (!primaryEmailAvailable) {
    console.log(`[${new Date().toISOString()}] Attempting to reconnect primary email service...`);
    initializePrimaryTransporter();
  }
}, 300000); // Check every 5 minutes

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
 * Send an email with retry logic and fallback options
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
  html?: string
): Promise<any> {
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
  
  // Log email sending attempt
  emailSendLog[recipient].push(now);
  
  const mailOptions = {
    from: `"Innovation Hub" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    text: text,
    html: html,
  };

  let lastError;
  // Attempt with primary transporter with retries
  if (primaryEmailAvailable && transporterInitialized) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[${new Date().toISOString()}] Sending email to: ${Array.isArray(to) ? to.join(', ') : to} (Attempt ${attempt})`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`[${new Date().toISOString()}] Email sent: ${info.messageId}`);
        return info;
      } catch (error) {
        lastError = error;
        console.error(`[${new Date().toISOString()}] Error sending email (Attempt ${attempt}):`, error);
        
        // If it's a connection error, mark primary as unavailable
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'EAUTH') {
          primaryEmailAvailable = false;
          console.log(`[${new Date().toISOString()}] Primary email service marked as unavailable. Will try fallback.`);
          break; // Exit retry loop and try fallback
        }
        
        if (attempt < MAX_RETRIES) {
          console.log(`[${new Date().toISOString()}] Retrying in ${RETRY_DELAY / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
  }

  // If primary failed or is unavailable, try fallback
  if (fallbackTransporterInitialized) {
    try {
      console.log(`[${new Date().toISOString()}] Using fallback email service for: ${Array.isArray(to) ? to.join(', ') : to}`);
      const info = await fallbackTransporter.sendMail(mailOptions);
      console.log(`[${new Date().toISOString()}] Email sent via fallback: ${info.messageId}`);
      
      // For Ethereal emails, provide the preview URL
      if (nodemailer.getTestMessageUrl && info) {
        console.log(`[${new Date().toISOString()}] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      
      return info;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Fallback email service also failed:`, error);
      throw error; // Both primary and fallback failed
    }
  } else {
    console.error(`[${new Date().toISOString()}] No available email transport. Primary and fallback both unavailable.`);
    throw lastError || new Error('No available email transport');
  }
}

/**
 * Send an email with attachments
 * @param options Email options including attachments
 * @returns Promise resolving to send info
 */
export async function sendEmailWithAttachments(options: EmailOptions): Promise<any> {
  const mailOptions = {
    from: `"Innovation Hub" <${process.env.EMAIL_USER}>`,
    ...options
  };

  let lastError;
  // Attempt with primary transporter with retries
  if (primaryEmailAvailable && transporterInitialized) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[${new Date().toISOString()}] Sending email with attachments to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to} (Attempt ${attempt})`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`[${new Date().toISOString()}] Email with attachments sent: ${info.messageId}`);
        return info;
      } catch (error) {
        lastError = error;
        console.error(`[${new Date().toISOString()}] Error sending email with attachments (Attempt ${attempt}):`, error);
        
        // If it's a connection error, mark primary as unavailable
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'EAUTH') {
          primaryEmailAvailable = false;
          console.log(`[${new Date().toISOString()}] Primary email service marked as unavailable. Will try fallback.`);
          break; // Exit retry loop and try fallback
        }
        
        if (attempt < MAX_RETRIES) {
          console.log(`[${new Date().toISOString()}] Retrying in ${RETRY_DELAY / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
  }

  // If primary failed or is unavailable, try fallback
  if (fallbackTransporterInitialized) {
    try {
      console.log(`[${new Date().toISOString()}] Using fallback email service for attachments email: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
      const info = await fallbackTransporter.sendMail(mailOptions);
      console.log(`[${new Date().toISOString()}] Email with attachments sent via fallback: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Fallback email service also failed for attachments:`, error);
      throw error; // Both primary and fallback failed
    }
  } else {
    console.error(`[${new Date().toISOString()}] No available email transport. Primary and fallback both unavailable.`);
    throw lastError || new Error('No available email transport');
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
): Promise<any> {
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

// Regularly check primary email connection
setInterval(() => {
  if (transporterInitialized) {
    transporter.verify((error, success) => {
      primaryEmailAvailable = !error;
      if (error) {
        console.log(`[${new Date().toISOString()}] Primary email service is currently unavailable:`, error.message);
      }
    });
  }
}, 600000); // Check every 10 minutes

// Log module initialization
console.log(`[${new Date().toISOString()}] Email utils initialized by shemaalain2025-cloud with improved reliability`);

module.exports = {
  sendEmail,
  sendEmailWithAttachments,
  sendTemplateEmail,
  EmailTemplate
};