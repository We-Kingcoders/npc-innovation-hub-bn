import { Request, Response } from 'express';
import HireUsInquiry from '../models/hireUsInquiry.model';
import { sendEmail } from '../utils/emailService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Submit a new hire inquiry (public endpoint)
 */
export const submitHireInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      first_name,
      last_name,
      company_name,
      job_title,
      country,
      message,
      consent
    } = req.body;

    // Validate required fields
    if (!email || !first_name || !last_name || !company_name || !job_title || !country || !message) {
      res.status(400).json({
        status: 'fail',
        message: 'Please provide all required fields'
      });
      return;
    }

    // Validate consent
    if (!consent) {
      res.status(400).json({
        status: 'fail',
        message: 'You must provide consent to submit the form'
      });
      return;
    }

    // Create new inquiry with explicit UUID
    const inquiry = await HireUsInquiry.create({
      id: uuidv4(),
      email,
      first_name,
      last_name,
      company_name,
      job_title,
      country,
      message,
      consent,
      status: 'Pending'
    });

    // Send confirmation email to user
    try {
      await sendEmail({
        to: email,
        subject: 'Thank you for your inquiry',
        html: `
          <h1>Thank you for contacting us, ${first_name}!</h1>
          <p>We have received your inquiry and will get back to you shortly.</p>
          <p>Your inquiry reference number: ${inquiry.id}</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue despite email failure
    }

    // Send notification to admin
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@example.com',
        subject: 'New Hire Us Inquiry',
        html: `
          <h1>New Inquiry Received</h1>
          <p><strong>From:</strong> ${first_name} ${last_name} (${email})</p>
          <p><strong>Company:</strong> ${company_name}</p>
          <p><strong>Job Title:</strong> ${job_title}</p>
          <p><strong>Country:</strong> ${country}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><a href="${process.env.ADMIN_URL || 'http://localhost:3000'}/admin/hire/${inquiry.id}">View in Admin Panel</a></p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Continue despite email failure
    }

    res.status(201).json({
      status: 'success',
      message: 'Your inquiry has been submitted successfully. We will contact you soon.',
      data: {
        inquiry: {
          id: inquiry.id,
          email: inquiry.email,
          name: `${inquiry.first_name} ${inquiry.last_name}`,
          created_at: inquiry.created_at
        }
      }
    });
  } catch (error) {
    console.error('Error submitting hire inquiry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit your inquiry. Please try again later.'
    });
  }
};