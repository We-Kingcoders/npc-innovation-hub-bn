/**
 * Email Utilities
 * Handles all email communication for Innovation Hub.
 * Uses @sendgrid/mail for production and nodemailer with Ethereal for development.
 * 
 * Last updated: 2025-10-03 09:36:46 UTC
 * Updated by: shemaalain2025-cloud
 */

import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { SentMessageInfo, Options } from "nodemailer/lib/smtp-transport";

dotenv.config();

// --- Production: SendGrid Setup ---
if (process.env.NODE_ENV === 'production') {
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log(`[${new Date().toISOString()}] SendGrid email configured for production.`);
  } else {
    console.error(`[${new Date().toISOString()}] FATAL: SENDGRID_API_KEY is not set for production environment.`);
  }
}

// --- Development: Nodemailer with Ethereal Setup ---
let devTransporter: nodemailer.Transporter<SentMessageInfo, Options> | null = null;
let transporterInitialized = process.env.NODE_ENV === 'production'; // Initialized if in production

if (process.env.NODE_ENV === 'development' && process.env.USE_ETHEREAL === 'true') {
  nodemailer.createTestAccount().then(testAccount => {
    devTransporter = nodemailer.createTransport({
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
    
    devTransporter.verify((error) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] Ethereal SMTP connection error:`, error);
      } else {
        console.log(`[${new Date().toISOString()}] Ethereal SMTP server is ready to send messages`);
      }
    });
  }).catch(err => {
    console.error(`[${new Date().toISOString()}] Failed to create Ethereal test account:`, err);
    // Fallback if needed, but for now we just log the error
  });
} else if (process.env.NODE_ENV === 'development') {
    console.warn(`[${new Date().toISOString()}] Development mode without USE_ETHEREAL=true. No email transport configured for dev.`);
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

// Rate limiting logic can remain the same if desired
const emailSendLog: Record<string, number[]> = {};
const MAX_EMAILS_PER_HOUR = 20;

/**
 * Send an email. Uses SendGrid for production, Nodemailer/Ethereal for development.
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
    const options: EmailOptions = { to, subject, text, html };
    return sendEmailWithAttachments(options);
}

/**
 * Send an email with attachments. Uses SendGrid for production, Nodemailer/Ethereal for development.
 * @param options Email options including attachments
 * @returns Promise resolving to send info
 */
export async function sendEmailWithAttachments(options: EmailOptions): Promise<any> {
  if (!transporterInitialized) {
    console.log(`[${new Date().toISOString()}] Waiting for email transporter to initialize...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!transporterInitialized) {
      throw new Error('Email transport not initialized. Please try again later.');
    }
  }

  // --- PRODUCTION: Use SendGrid API ---
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SENDGRID_VERIFIED_SENDER) {
      throw new Error("SENDGRID_VERIFIED_SENDER is not set in environment variables.");
    }
    const msg: any = {
      to: options.to,
      from: {
        name: "Innovation Hub",
        email: process.env.SENDGRID_VERIFIED_SENDER
      },
      subject: options.subject,
      text: options.text,
      html: options.html,
      cc: options.cc,
      bcc: options.bcc,
    };

    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments.map(att => ({
        content: fs.readFileSync(att.path).toString('base64'),
        filename: att.filename,
        type: att.contentType,
        disposition: 'attachment',
      }));
    }

    try {
      console.log(`[${new Date().toISOString()}] Sending email via SendGrid to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
      const response = await sgMail.send(msg);
      console.log(`[${new Date().toISOString()}] Email sent successfully via SendGrid.`);
      return response;
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] Error sending email via SendGrid:`, error);
      if (error.response) {
        console.error('SendGrid Error Body:', error.response.body);
      }
      throw error;
    }
  }

  // --- DEVELOPMENT: Use Nodemailer with Ethereal ---
  else if (process.env.NODE_ENV === 'development' && devTransporter) {
    const mailOptions = {
        from: `"Innovation Hub (Dev)" <no-reply@innovation-hub.dev>`,
        to: options.to, // Ethereal will catch this
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        cc: options.cc,
        bcc: options.bcc,
    };

    try {
        console.log(`[${new Date().toISOString()}] Sending DEV email to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
        const info = await devTransporter.sendMail(mailOptions);
        console.log(`[${new Date().toISOString()}] DEV Email sent: ${info.messageId}`);
        console.log(`[${new Date().toISOString()}] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        return info;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending DEV email:`, error);
        throw error;
    }
  }
  
  // Fallback if no transport is configured
  else {
    console.warn(`[${new Date().toISOString()}] Email not sent. No email transport is configured for the current environment.`);
    return Promise.resolve();
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
  const defaultData = {
    appName: 'Innovation Hub',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@yourdomain.com',
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

module.exports = {
  sendEmail,
  sendEmailWithAttachments,
  sendTemplateEmail,
  EmailTemplate
};