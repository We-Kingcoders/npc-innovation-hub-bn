/**
 * Email Utilities
 * Handles all email communication for Innovation Hub.
 * Uses @sendgrid/mail for production and nodemailer with Ethereal for development.
 * 
 * Last updated: 2025-10-03 09:36:46 UTC
 * Updated by: shemaalain2025-cloud
 */

import nodemailer, { Transporter } from "nodemailer";
import sgMail from "@sendgrid/mail";
import fs from "fs";
import dotenv from "dotenv";
import { SMTPSentMessageInfo } from "nodemailer/lib/smtp-transport";
import type { NodemailerError } from "nodemailer";
import { renderBrandedEmail } from "./emailTemplate.utils";

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
let devTransporter: Transporter<SMTPSentMessageInfo> | null = null;
let transporterInitialized = process.env.NODE_ENV === 'production'; // Initialized if in production

if (process.env.NODE_ENV === 'development') {
  // Use Gmail if credentials are provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    devTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    transporterInitialized = true;
    console.log(`[${new Date().toISOString()}] Gmail email configured for development`);
    
    devTransporter.verify((error: NodemailerError | null) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] Gmail SMTP connection error:`, error);
      } else {
        console.log(`[${new Date().toISOString()}] Gmail SMTP server is ready to send messages`);
      }
    });
  }
  // Fallback to Ethereal if USE_ETHEREAL is true
  else if (process.env.USE_ETHEREAL === 'true') {
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
      
      devTransporter.verify((error: NodemailerError | null) => {
        if (error) {
          console.error(`[${new Date().toISOString()}] Ethereal SMTP connection error:`, error);
        } else {
          console.log(`[${new Date().toISOString()}] Ethereal SMTP server is ready to send messages`);
        }
      });
    }).catch(err => {
      console.error(`[${new Date().toISOString()}] Failed to create Ethereal test account:`, err);
    });
  } else {
    console.warn(`[${new Date().toISOString()}] Development mode without email credentials. No email transport configured.`);
  }
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
  APPLICATION_ACCEPTED = 'application-accepted',
  APPLICATION_REJECTED = 'application-rejected',
}

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

  // --- DEVELOPMENT: Use Nodemailer with Gmail or Ethereal ---
  else if (process.env.NODE_ENV === 'development' && devTransporter) {
    const fromEmail = process.env.EMAIL_USER || 'no-reply@innovation-hub.dev';
    const mailOptions = {
        from: `"Innovation Hub (Dev)" <${fromEmail}>`,
        to: options.to,
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
Your account has been created successfully. You can now sign in and start exploring our platform.

Best regards,
The Innovation Hub Team
      `;
      html = renderBrandedEmail({
        previewText: `Welcome to Innovation Hub, ${data.firstName}!`,
        heading: "Welcome to Innovation Hub!",
        bodyHtml: `
          <p>Dear ${data.firstName},</p>
          <p>We're excited to have you join our community of innovators and creators.</p>
          <p>Your account has been created successfully. You can now sign in and start exploring our platform.</p>
          <p>Best regards,<br>The Innovation Hub Team</p>
        `,
      });
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
      html = renderBrandedEmail({
        previewText: "Please verify your email address.",
        heading: "Email Verification",
        bodyHtml: `
          <p>Dear ${data.firstName},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <p>If you did not create an account with us, please disregard this message.</p>
          <p>Best regards,<br>The Innovation Hub Team</p>
        `,
        ctaText: "Verify Email",
        ctaLink: data.verificationLink,
      });
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
      html = renderBrandedEmail({
        previewText: "Reset your Innovation Hub password.",
        heading: "Password Reset Request",
        bodyHtml: `
          <p>Dear ${data.firstName},</p>
          <p>We received a request to reset your password. Please click the button below to set a new password:</p>
          <p>If you did not request a password reset, please ignore this email.</p>
          <p>Best regards,<br>The Innovation Hub Team</p>
        `,
        ctaText: "Reset Password",
        ctaLink: data.resetLink,
      });
      break;

    // Declared in the EmailTemplate enum and actively called (see
    // password.event.ts's PASSWORD_EVENTS.LOCKED handler, which fires
    // every time a user's account gets auto-locked after too many failed
    // sign-in attempts) but had no case here at all - every call fell
    // through to the `default: throw` below, silently failing (caught by
    // that handler's own try/catch and only logged) rather than actually
    // notifying the user their account was locked.
    case EmailTemplate.ACCOUNT_DEACTIVATION:
      subject = 'Innovation Hub - Your Account Has Been Deactivated';
      text = `
Dear ${data.firstName},

${data.message || 'Your account on the Innovation Hub platform has been deactivated.'}

If you believe this is a mistake, please contact our support team.

Best regards,
The Innovation Hub Team
      `;
      html = renderBrandedEmail({
        previewText: "Your Innovation Hub account has been deactivated.",
        heading: "Account Deactivated",
        bodyHtml: `
          <p>Dear ${data.firstName},</p>
          <p>${data.message || 'Your account on the Innovation Hub platform has been deactivated.'}</p>
          <p>If you believe this is a mistake, please contact our support team.</p>
          <p>Best regards,<br>The Innovation Hub Team</p>
        `,
      });
      break;

    // Not currently called anywhere, but declared alongside
    // ACCOUNT_DEACTIVATION above - added for the same reason and so a
    // future caller doesn't rediscover the same silent-throw gap.
    case EmailTemplate.ACCOUNT_ACTIVATION:
      subject = 'Innovation Hub - Your Account Is Active Again';
      text = `
Dear ${data.firstName},

${data.message || 'Your account on the Innovation Hub platform has been reactivated. You can sign in as usual.'}

Best regards,
The Innovation Hub Team
      `;
      html = renderBrandedEmail({
        previewText: "Your Innovation Hub account is active again.",
        heading: "Account Reactivated",
        bodyHtml: `
          <p>Dear ${data.firstName},</p>
          <p>${data.message || 'Your account on the Innovation Hub platform has been reactivated. You can sign in as usual.'}</p>
          <p>Best regards,<br>The Innovation Hub Team</p>
        `,
        ctaText: data.loginLink ? "Sign In" : undefined,
        ctaLink: data.loginLink,
      });
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
      html = renderBrandedEmail({
        previewText: `Your role has been updated to ${data.newRole}.`,
        heading: "Role Update",
        bodyHtml: `
          <p>Dear ${data.firstName},</p>
          <p>Your role on the Innovation Hub platform has been updated to <strong>${data.newRole}</strong>.</p>
          ${data.message ? `<p>${data.message}</p>` : ''}
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>The Innovation Hub Team</p>
        `,
      });
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
      html = renderBrandedEmail({
        previewText: `You're invited: ${data.eventName}`,
        heading: "You're Invited!",
        bodyHtml: `
          <p>Dear ${data.firstName},</p>
          <p>You're invited to join our event: <strong>${data.eventName}</strong></p>
          <div style="background-color: #f4f7fc; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>Date:</strong> ${data.eventDate}</p>
            <p style="margin: 0 0 8px;"><strong>Time:</strong> ${data.eventTime}</p>
            ${data.eventLocation ? `<p style="margin: 0 0 8px;"><strong>Location:</strong> ${data.eventLocation}</p>` : ''}
            ${data.eventLink ? `<p style="margin: 0;"><strong>Link:</strong> <a href="${data.eventLink}" style="color: #002B56;">${data.eventLink}</a></p>` : ''}
          </div>
          ${data.eventDescription ? `<p>${data.eventDescription}</p>` : ''}
          <p>We hope to see you there!</p>
          <p>Best regards,<br>The Innovation Hub Team</p>
        `,
      });
      break;

    case EmailTemplate.APPLICATION_ACCEPTED:
      subject = 'Innovation Hub - Welcome! Your Membership Application Was Accepted';
      text = `
Dear ${data.firstName},

Congratulations! Your membership application to Innovation Hub has been accepted.

We've created your account. Here are your temporary sign-in details:

Email: ${data.email}
Temporary Password: ${data.tempPassword}

Sign in here: ${data.loginLink}

This temporary password expires in ${data.expiresInDays} days. Please sign in and change your password before then. If it expires first, use the Forgot Password option to set a new one.

Welcome aboard!

Best regards,
The Innovation Hub Team
      `;
      html = renderBrandedEmail({
        previewText: "Your membership application was accepted!",
        heading: "Welcome to Innovation Hub!",
        bodyHtml: `
          <p>Dear ${data.firstName},</p>
          <p>Congratulations! Your membership application has been accepted.</p>
          <div style="background-color: #f4f7fc; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>Email:</strong> ${data.email}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> ${data.tempPassword}</p>
          </div>
          <p>This temporary password expires in <strong>${data.expiresInDays} days</strong>. Please sign in and change your password before then. If it expires first, use the Forgot Password option to set a new one.</p>
          <p>Welcome aboard!</p>
          <p>Best regards,<br>The Innovation Hub Team</p>
        `,
        ctaText: "Sign In",
        ctaLink: data.loginLink,
      });
      break;

    case EmailTemplate.APPLICATION_REJECTED:
      subject = 'Innovation Hub - Update on Your Membership Application';
      text = `
Dear ${data.firstName},

Thank you for taking the time to apply for membership with Innovation Hub and for sharing your background and experience with us.

After careful review, we are unable to move forward with your application at this time.
${data.reason ? `\nAdditional feedback: ${data.reason}\n` : ''}
We truly appreciate your interest in our community and encourage you to apply again in the future.

Best regards,
The Innovation Hub Team
      `;
      html = renderBrandedEmail({
        previewText: "An update on your membership application.",
        heading: "Update on Your Membership Application",
        bodyHtml: `
          <p>Dear ${data.firstName},</p>
          <p>Thank you for taking the time to apply for membership with Innovation Hub and for sharing your background and experience with us.</p>
          <p>After careful review, we are unable to move forward with your application at this time.</p>
          ${data.reason ? `<div style="background-color: #f4f7fc; padding: 16px; border-radius: 8px; margin: 20px 0;"><strong>Additional feedback:</strong> ${data.reason}</div>` : ''}
          <p>We truly appreciate your interest in our community and encourage you to apply again in the future.</p>
          <p>Best regards,<br>The Innovation Hub Team</p>
        `,
      });
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