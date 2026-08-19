import { Request, Response } from 'express';
import Application from '../../models/application.model';
import User from '../../models/user.model';
import Member from '../../models/member.model';
import sequelize from '../../config/database';
import { sendTemplateEmail, EmailTemplate } from '../../utils/email.utils';
import { generateSecurePassword, hashPassword } from '../../utils/password.utils';

const TEMP_PASSWORD_VALIDITY_DAYS = 2;

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.length > 0 ? rest.join(' ') : firstName };
}

// PATCH /api/admin/applications/:id/accept - creates the member's account
// (User + Member) and sends a styled acceptance email with a temporary
// password, all inside one transaction. If any step fails - including the
// email send - everything rolls back and the application stays Pending.
export const acceptApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
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

    const tempPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(tempPassword);
    const passwordExpiresAt = new Date(Date.now() + TEMP_PASSWORD_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    const { firstName, lastName } = splitFullName(application.fullName);

    try {
      const { user, member } = await sequelize.transaction(async (t) => {
        const user = await User.create(
          {
            firstName,
            lastName,
            email: application.email,
            password: hashedPassword,
            phone: application.phoneNumber,
            image: application.imageUrl ?? undefined,
            gender: application.gender,
            role: 'Member',
            verified: true,
            isActive: true,
            isTemporaryPassword: true,
            passwordExpiresAt,
          },
          { transaction: t }
        );

        const member = await Member.create(
          {
            userId: user.id,
            name: application.fullName,
            role: 'Other',
            imageUrl: application.imageUrl ?? '/members-images/member-demo.jpg',
            skills: application.skills,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { transaction: t }
        );

        await sendTemplateEmail(application.email, EmailTemplate.APPLICATION_ACCEPTED, {
          firstName,
          email: application.email,
          tempPassword,
          loginLink: `${process.env.FRONTEND_URL}/login`,
          expiresInDays: TEMP_PASSWORD_VALIDITY_DAYS,
        });

        await application.update(
          { status: 'Accepted', reviewedBy: currentUser.id, reviewedAt: new Date() },
          { transaction: t }
        );

        return { user, member };
      });

      res.status(200).json({
        status: 'success',
        message: 'Application accepted',
        data: {
          application,
          user: { id: user.id, email: user.email, firstName, lastName },
          member: { id: member.id },
        },
      });
    } catch (transactionError) {
      console.error('Error accepting application, changes rolled back:', transactionError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to accept application. No changes were saved.',
      });
    }
  } catch (error) {
    console.error('Error accepting application:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to accept application',
    });
  }
};
