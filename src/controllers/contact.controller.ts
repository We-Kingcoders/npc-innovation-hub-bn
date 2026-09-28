import { Request, Response } from 'express';
import ContactMessage from '../models/contactMessage.model';
import { sendEmail } from '../utils/emailService';
import { renderBrandedEmail } from '../utils/emailTemplate.utils';
import { escapeHtml } from '../utils/html.utils';

// POST /api/contact - public, no auth. Body already validated by
// validateContactMessage (Joi) before this runs.
export const submitContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, message } = req.body as { name: string; email: string; message: string };

    const contactMessage = await ContactMessage.create({
      name,
      email,
      message,
      status: 'Pending',
    });

    // Confirmation email to the submitter - a genuine best-effort send:
    // the submission itself already succeeded and is stored, so an email
    // provider hiccup here must never turn into a failed request or a
    // lost message.
    try {
      await sendEmail({
        to: email,
        subject: 'We received your message - NPC Innovation Hub',
        html: renderBrandedEmail({
          previewText: "We've received your message and will review it shortly.",
          heading: `Thank you for reaching out, ${escapeHtml(name)}!`,
          bodyHtml: `
            <p>We have received your message and our team will review it as soon as possible. We'll get back to you at this email address if a response is needed.</p>
            <div style="background-color: #f4f7fc; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Your message</p>
              <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Reference: ${contactMessage.id}</p>
          `,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send contact confirmation email:', emailError);
      // Continue despite email failure - the message itself is already saved.
    }

    // Notification to the hub's own inbox, mirroring hire.controller.ts's
    // admin-notification pattern - best-effort, never blocks the response.
    try {
      await sendEmail({
        to: process.env.CONTACT_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'admin@example.com',
        subject: 'New Contact Us message',
        html: renderBrandedEmail({
          previewText: `New message from ${name}`,
          heading: 'New Contact Us Message',
          bodyHtml: `
            <div style="background-color: #f4f7fc; padding: 16px; border-radius: 8px; margin: 0 0 20px;">
              <p style="margin: 0 0 8px;"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
              <p style="margin: 0; white-space: pre-wrap;"><strong>Message:</strong> ${escapeHtml(message)}</p>
            </div>
          `,
          ctaText: 'Review in Admin Panel',
          ctaLink: `${process.env.ADMIN_URL || 'http://localhost:3000'}/admin/contact-messages`,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send contact notification email:', emailError);
    }

    res.status(201).json({
      status: 'success',
      message: 'Your message has been sent successfully. We will review it and get back to you soon.',
      data: {
        contactMessage: {
          id: contactMessage.id,
          email: contactMessage.email,
          name: contactMessage.name,
          createdAt: contactMessage.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Error submitting contact message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send your message. Please try again later.',
    });
  }
};
