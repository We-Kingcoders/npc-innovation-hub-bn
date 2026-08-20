import { Request, Response } from 'express';
import Application from '../../models/application.model';
import { sendTemplateEmail, EmailTemplate } from '../../utils/email.utils';

// GET /api/admin/applications?status=Pending|Accepted|Rejected
export const getApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const whereClause: Record<string, unknown> = {};
    if (status) {
      whereClause.status = status;
    }

    const applications = await Application.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      results: applications.length,
      data: { applications },
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch applications',
    });
  }
};

// GET /api/admin/applications/:id
export const getApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await Application.findByPk(id);
    if (!application) {
      res.status(404).json({
        status: 'fail',
        message: 'Application not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { application },
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch application',
    });
  }
};

// PATCH /api/admin/applications/:id/reject - body: { reason?: string }
export const rejectApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const currentUser = req.user as { id: string; role: string };

    const application = await Application.findByPk(id);
    if (!application) {
      res.status(404).json({
        status: 'fail',
        message: 'Application not found',
      });
      return;
    }

    if (application.status !== 'Pending') {
      res.status(409).json({
        status: 'fail',
        message: `This application has already been ${application.status.toLowerCase()}`,
      });
      return;
    }

    try {
      await sendTemplateEmail(application.email, EmailTemplate.APPLICATION_REJECTED, {
        firstName: application.fullName,
        reason,
      });
    } catch (emailError) {
      console.error('Failed to send application rejection email:', emailError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to send rejection email. Please try again later.',
      });
      return;
    }

    await application.update({
      status: 'Rejected',
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
    });

    res.status(200).json({
      status: 'success',
      message: 'Application rejected',
      data: { application },
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reject application',
    });
  }
};
