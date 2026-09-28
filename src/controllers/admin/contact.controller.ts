import { Request, Response } from 'express';
import { Op } from 'sequelize';
import ContactMessage from '../../models/contactMessage.model';
import { sendEmail } from '../../utils/emailService';
import { renderBrandedEmail } from '../../utils/emailTemplate.utils';
import { escapeHtml } from '../../utils/html.utils';

// GET /api/admin/contact-messages
export const getAllContactMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, page = '1', limit = '10', sort = 'createdAt', order = 'DESC' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;

    const sortField = Array.isArray(sort) ? sort[0] : (sort ?? 'createdAt');
    const orderDirection = Array.isArray(order) ? order[0] : (order ?? 'DESC');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { message: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await ContactMessage.findAndCountAll({
      where: whereClause,
      order: [[String(sortField), String(orderDirection)]],
      limit: limitNumber,
      offset,
    });

    res.status(200).json({
      status: 'success',
      results: rows.length,
      data: {
        contactMessages: rows,
        pagination: {
          total: count,
          currentPage: pageNumber,
          totalPages: Math.ceil(count / limitNumber),
          limit: limitNumber,
        },
      },
    });
  } catch (error) {
    console.error('Error getting contact messages:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get contact messages',
    });
  }
};

// GET /api/admin/contact-messages/:id
export const getContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const contactMessage = await ContactMessage.findByPk(id);

    if (!contactMessage) {
      res.status(404).json({ status: 'fail', message: 'Contact message not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: { contactMessage } });
  } catch (error) {
    console.error('Error getting contact message:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get contact message' });
  }
};

// PATCH /api/admin/contact-messages/:id - status only, explicit allow-list
// (matches updateInquiry's own comment/reasoning in admin/hire.controller.ts:
// never spread req.body straight into .update()).
export const updateContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string; role: string; firstName?: string; lastName?: string };

    const contactMessage = await ContactMessage.findByPk(id);
    if (!contactMessage) {
      res.status(404).json({ status: 'fail', message: 'Contact message not found' });
      return;
    }

    const { status } = req.body as { status?: 'Pending' | 'Reviewed' | 'Closed' };
    if (!status || !['Pending', 'Reviewed', 'Closed'].includes(status)) {
      res.status(400).json({ status: 'fail', message: 'A valid status is required' });
      return;
    }

    await contactMessage.update({ status });

    console.log(
      `[${new Date().toISOString()}] Contact message ${id} updated to "${status}" by ${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''} (${currentUser.id})`,
    );

    res.status(200).json({ status: 'success', data: { contactMessage } });
  } catch (error) {
    console.error('Error updating contact message:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update contact message' });
  }
};

// DELETE /api/admin/contact-messages/:id
export const deleteContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user as { id: string; role: string; firstName?: string; lastName?: string };

    const contactMessage = await ContactMessage.findByPk(id);
    if (!contactMessage) {
      res.status(404).json({ status: 'fail', message: 'Contact message not found' });
      return;
    }

    await contactMessage.destroy();

    console.log(
      `[${new Date().toISOString()}] Contact message ${id} deleted by ${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''} (${currentUser.id})`,
    );

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    console.error('Error deleting contact message:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete contact message' });
  }
};

// POST /api/admin/contact-messages/:id/reply
export const replyToContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body as { subject?: string; message?: string };
    const currentUser = req.user as { id: string; role: string; firstName?: string; lastName?: string };

    if (!subject || !message) {
      res.status(400).json({ status: 'fail', message: 'Please provide subject and message' });
      return;
    }

    const contactMessage = await ContactMessage.findByPk(id);
    if (!contactMessage) {
      res.status(404).json({ status: 'fail', message: 'Contact message not found' });
      return;
    }

    try {
      await sendEmail({
        to: contactMessage.email,
        subject,
        html: renderBrandedEmail({
          heading: `Hello ${escapeHtml(contactMessage.name)},`,
          bodyHtml: `
            <div style="background-color: #f4f7fc; padding: 16px; border-radius: 8px; margin: 0 0 20px; white-space: pre-wrap;">
              ${escapeHtml(message)}
            </div>
            <p>
              Best regards,<br />
              ${escapeHtml(`${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() || 'The Team')}<br />
              NPC Innovation Hub Team
            </p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
              This email is in reference to your message submitted on ${new Date(contactMessage.createdAt).toLocaleDateString()}.
            </p>
          `,
        }),
      });

      if (contactMessage.status === 'Pending') {
        await contactMessage.update({ status: 'Reviewed' });
      }

      console.log(
        `[${new Date().toISOString()}] Reply sent to contact message ${id} by ${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''} (${currentUser.id})`,
      );

      res.status(200).json({
        status: 'success',
        message: 'Reply sent successfully',
        data: { contactMessage },
      });
    } catch (emailError) {
      console.error('Failed to send contact reply email:', emailError);
      res.status(500).json({ status: 'error', message: 'Failed to send email. Please try again later.' });
    }
  } catch (error) {
    console.error('Error replying to contact message:', error);
    res.status(500).json({ status: 'error', message: 'Failed to reply to contact message' });
  }
};
