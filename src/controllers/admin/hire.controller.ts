import { Request, Response } from 'express';
import HireUsInquiry from '../../models/hireUsInquiry.model';
import { sendEmail } from '../../utils/emailService';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all hire inquiries
 */
export const getAllInquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, page = '1', limit = '10', sort = 'created_at', order = 'DESC' } = req.query;
    
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const offset = (pageNumber - 1) * limitNumber;

    // Ensure sort and order are strings
    const sortField = Array.isArray(sort) ? sort[0] : (sort ?? 'created_at');
    const orderDirection = Array.isArray(order) ? order[0] : (order ?? 'DESC');
    
    // Build where clause based on filters
    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { company_name: { [Op.iLike]: `%${search}%` } },
        { country: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Get inquiries with pagination
    const { count, rows } = await HireUsInquiry.findAndCountAll({
      where: whereClause,
      order: [[String(sortField), String(orderDirection)]],
      limit: limitNumber,
      offset
    });
    
    const totalPages = Math.ceil(count / limitNumber);
    
    res.status(200).json({
      status: 'success',
      results: rows.length,
      data: {
        inquiries: rows,
        pagination: {
          total: count,
          currentPage: pageNumber,
          totalPages,
          limit: limitNumber
        }
      }
    });
  } catch (error) {
    console.error('Error getting hire inquiries:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get hire inquiries'
    });
  }
};

/**
 * Get a single hire inquiry
 */
export const getInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const inquiry = await HireUsInquiry.findByPk(id);
    
    if (!inquiry) {
      res.status(404).json({
        status: 'fail',
        message: 'Inquiry not found'
      });
      return;
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        inquiry
      }
    });
  } catch (error) {
    console.error('Error getting hire inquiry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get hire inquiry'
    });
  }
};

/**
 * Update a hire inquiry
 */
export const updateInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Using req.user from your auth middleware
    const currentUser = req.user as { id: string; role: string; firstName: string; lastName: string };
    
    const inquiry = await HireUsInquiry.findByPk(id);
    
    if (!inquiry) {
      res.status(404).json({
        status: 'fail',
        message: 'Inquiry not found'
      });
      return;
    }
    
    // Update the inquiry
    await inquiry.update({
      ...req.body,
      updated_at: new Date()
    });
    
    // Audit logging
    console.log(`[${new Date().toISOString()}] Inquiry ${id} updated by ${currentUser.firstName} ${currentUser.lastName} (${currentUser.id})`);
    
    res.status(200).json({
      status: 'success',
      data: {
        inquiry
      }
    });
  } catch (error) {
    console.error('Error updating hire inquiry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update hire inquiry'
    });
  }
};

/**
 * Delete a hire inquiry
 */
export const deleteInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string; role: string; firstName: string; lastName: string };
    
    const inquiry = await HireUsInquiry.findByPk(id);
    
    if (!inquiry) {
      res.status(404).json({
        status: 'fail',
        message: 'Inquiry not found'
      });
      return;
    }
    
    // Delete the inquiry
    await inquiry.destroy();
    
    // Audit logging
    console.log(`[${new Date().toISOString()}] Inquiry ${id} deleted by ${currentUser.firstName} ${currentUser.lastName} (${currentUser.id})`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error deleting hire inquiry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete hire inquiry'
    });
  }
};

/**
 * Reply to a hire inquiry
 */
export const replyToInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body;
    const currentUser = req.user as { id: string; role: string; firstName: string; lastName: string };
    
    if (!subject || !message) {
      res.status(400).json({
        status: 'fail',
        message: 'Please provide subject and message'
      });
      return;
    }
    
    const inquiry = await HireUsInquiry.findByPk(id);
    
    if (!inquiry) {
      res.status(404).json({
        status: 'fail',
        message: 'Inquiry not found'
      });
      return;
    }
    
    // Send email to the client
    try {
      await sendEmail({
        to: inquiry.email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${inquiry.first_name},</h2>
            <div style="padding: 20px; border-radius: 5px; background-color: #f9f9f9;">
              ${message}
            </div>
            <p style="margin-top: 20px;">
              Best regards,<br />
              ${currentUser.firstName} ${currentUser.lastName}<br />
              NPC Innovation Hub Team
            </p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">
              This email is in reference to your inquiry submitted on ${new Date(inquiry.created_at).toLocaleDateString()}.
            </p>
          </div>
        `
      });
    
      // Update inquiry status to Contacted if it was Pending
      if (inquiry.status === 'Pending') {
        await inquiry.update({
          status: 'Contacted',
          updated_at: new Date()
        });
      }
      
      // Audit logging
      console.log(`[${new Date().toISOString()}] Reply sent to inquiry ${id} by ${currentUser.firstName} ${currentUser.lastName} (${currentUser.id})`);
      
      res.status(200).json({
        status: 'success',
        message: 'Reply sent successfully',
        data: {
          inquiry
        }
      });
    } catch (emailError) {
      console.error('Failed to send reply email:', emailError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to send email. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Error replying to hire inquiry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reply to inquiry'
    });
  }
};