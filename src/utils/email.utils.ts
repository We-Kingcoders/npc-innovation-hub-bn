/**
 * Email Utilities
 * Handles all email communication for Innovation Hub
 * 
 * Last updated: 2025-07-02 08:52:42 UTC
 * Updated by: Alain275
 */

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { SentMessageInfo, Options } from "nodemailer/lib/smtp-transport";

dotenv.config();

// Initialize with a default transporter
let transporter: nodemailer.Transporter<SentMessageInfo, Options> = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Flag to track if transporter is initialized
let transporterInitialized = true;

// Check if we're using development mode with Ethereal email
if (process.env.NODE_ENV === 'development' && process.env.USE_ETHEREAL === 'true') {
  // Set flag to false until Ethereal account is created
  transporterInitialized = false;
  
  // Create Ethereal test account for development
  nodemailer.createTestAccount().then(testAccount => {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    transporterInitialized = true;
    console.log(`[${new Date().toISOString()}] Ethereal email configured for development`);
    console.log(`[${new Date().toISOString()}] Credentials: ${testAccount.user} / ${testAccount.pass}`);
    console.log(`[${new Date().toISOString()}] View emails at: https://ethereal.email`);
    
    // Verify connection once Ethereal is set up
    transporter.verify((error, success) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] SMTP connection error:`, error);
      } else {
        console.log(`[${new Date().toISOString()}] SMTP server is ready to send messages`);
      }
    });
  }).catch(err => {
    console.error(`[${new Date().toISOString()}] Failed to create Ethereal test account:`, err);
    console.log(`[${new Date().toISOString()}] Falling back to default email transport`);
    transporterInitialized = true; // Fall back to default transporter
  });
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
 * Send an email
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
  // Wait for transporter to be initialized
  if (!transporterInitialized) {
    console.log(`[${new Date().toISOString()}] Waiting for email transporter to initialize...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!transporterInitialized) {
      throw new Error('Email transport not initialized. Please try again later.');
    }
  }
  
  // In development with Ethereal, redirect all emails to the test account
  if (process.env.NODE_ENV === 'development' && process.env.USE_ETHEREAL === 'true') {
    console.log(`[${new Date().toISOString()}] Development mode: Redirecting email to Ethereal`);
    console.log(`[${new Date().toISOString()}] Original recipient: ${Array.isArray(to) ? to.join(', ') : to}`);
    console.log(`[${new Date().toISOString()}] Email subject: ${subject}`);
    // The recipient will be ignored and the email will go to the Ethereal inbox
  } else {
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
  }
  
  const mailOptions = {
    from: `"Innovation Hub" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    text: text,
    html: html,
  };

  try {
    console.log(`[${new Date().toISOString()}] Sending email to: ${Array.isArray(to) ? to.join(', ') : to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[${new Date().toISOString()}] Email sent: ${info.messageId}`);
    
    // For Ethereal emails, provide the preview URL
    if (process.env.NODE_ENV === 'development' && process.env.USE_ETHEREAL === 'true' && info.messageId) {
      console.log(`[${new Date().toISOString()}] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending email:`, error);
    throw error;
  }
}

/**
 * Send an email with attachments
 * @param options Email options including attachments
 * @returns Promise resolving to send info
 */
export async function sendEmailWithAttachments(options: EmailOptions): Promise<any> {
  // Wait for transporter to be initialized
  if (!transporterInitialized) {
    console.log(`[${new Date().toISOString()}] Waiting for email transporter to initialize...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!transporterInitialized) {
      throw new Error('Email transport not initialized. Please try again later.');
    }
  }
  
  const mailOptions = {
    from: `"Innovation Hub" <${process.env.EMAIL_USER}>`,
    ...options
  };

  try {
    console.log(`[${new Date().toISOString()}] Sending email with attachments to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[${new Date().toISOString()}] Email with attachments sent: ${info.messageId}`);
    
    // For Ethereal emails, provide the preview URL
    if (process.env.NODE_ENV === 'development' && process.env.USE_ETHEREAL === 'true' && info.messageId) {
      console.log(`[${new Date().toISOString()}] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending email with attachments:`, error);
    throw error;
  }
}

// Rest of the file remains the same
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

    // Other template cases remain unchanged...
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

// Verify connection on startup (only for Gmail initially)
if (process.env.NODE_ENV !== 'development' || process.env.USE_ETHEREAL !== 'true') {
  transporter.verify((error, success) => {
    if (error) {
      console.error(`[${new Date().toISOString()}] SMTP connection error:`, error);
    } else {
      console.log(`[${new Date().toISOString()}] SMTP server is ready to send messages`);
    }
  });
}

// Log module initialization
console.log(`[2025-07-02 08:52:42] Email utils initialized by Alain275`);

module.exports = {
  sendEmail,
  sendEmailWithAttachments,
  sendTemplateEmail,
  EmailTemplate
};