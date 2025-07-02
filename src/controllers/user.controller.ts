import { Request, Response, NextFunction } from 'express'
import cloudinary from "../utils/cloudinary.utils";

type MulterFile = Express.Multer.File;

declare global {
  namespace Express {
    interface Request {
      file?: MulterFile;
    }
  }
}
import { UserSignupAttributes } from '../types/user.type'
import { UserService } from '../services/user.services';
import { generateToken, decodeToken } from '../utils/tokenGenerator.utils'
import { hashPassword, comparePassword } from '../utils/password.utils'
import { sendEmail, sendTemplateEmail, EmailTemplate } from '../utils/email.utils';
import passport from 'passport'
import { AccountStatusMessages } from '../utils/variable.utils'
import { sendReasonEmail } from '../utils/sendReson.util'
import { addToBlacklist } from '../utils/tokenBlacklist'
import { passwordEventEmitter } from '../events/password.event'

import '../utils/cloudinary.utils'
import User from '../models/user.model'
import { sendNotification } from '../validations/socket';
import { Notification, NotificationType } from '../models/notification.modal';

export const userSignup = async (req: Request, res: Response) => {
  try {
    const hashedpassword: any = await hashPassword(req.body.password)
    const user: UserSignupAttributes = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hashedpassword,
      gender: req.body.gender,
      phone: req.body.phone,
      role: req.body.role || 'Member',
      updatedAt: new Date(),
      createdAt: new Date(),
    }

    const createdUser = await UserService.register(user)
    const token = await generateToken(createdUser, '1d')

    const verificationLink = `${process.env.BACKEND_URL}/api/users/verify-email?token=${token}`
    
    const subject = 'Innovation Hub - Email Verification'

    const text = `
Dear ${user.firstName},

Thank you for joining the Innovation Hub! To complete your signup, please verify your email address by clicking the link below:

${verificationLink}

If you did not create an account with us, please disregard this message and Report.

Best regards,
Innovation Hub Team
    `

    const html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">Innovation Hub - Email Verification</h2>
  <p>Dear ${user.firstName},</p>
  <p>Thank you for joining the Innovation Hub! To complete your signup, please verify your email address by clicking the button below:</p>
  <p>
    <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: #ffffff; text-decoration: none; border-radius: 4px;">
      Verify Email
    </a>
  </p>
  <p>If you did not create an account with us, please disregard this message and Report.</p>
  <p>Best regards,<br>Innovation Hub Team</p>
</div>
    `

    if (user.email) {
      await sendEmail(user.email, subject, text, html)
    } else {
      throw new Error('User email is undefined');
    }

    const userWithoutPassword = { ...createdUser.dataValues }
    delete userWithoutPassword.password

    res.status(200).json({
      status: 'success',
      message: 'User created successfully',
      token: token,
    })
  } catch (error) {
    console.log(error, 'Error in creating account')
    res.status(500).json({
      status: 'error',
      message: 'Error in creating account',
    })
  }
}

export const updateRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = req.params.id
    const { role } = req.body

    if (role !== 'Admin' && role !== 'Member') {
      res.status(400).json({
        status: 'fail',
        message: 'Role must be either Admin or Member',
      })
      return
    }

    const user = await UserService.getUserByid(id)
    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      })
      return 
    }

    user.role = role
    await user.save() 

    const userWithoutPassword = { ...user.dataValues }
    delete userWithoutPassword.password
    
    const notificationMessage = `Your role has been updated to ${role}`;
    sendNotification(id, NotificationType.NEW_REMINDER, notificationMessage, user.id);
    
    const subject = 'Innovation Hub - Role Update'
    const text = `
Dear ${user.firstName},

Your role in the Innovation Hub has been updated to ${role}.

If you have any questions about your new role, please contact our support team.

Best regards,
Innovation Hub Team
    `

    const html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">Innovation Hub - Role Update</h2>
  <p>Dear ${user.firstName},</p>
  <p>Your role in the Innovation Hub has been updated to <strong>${role}</strong>.</p>
  <p>If you have any questions about your new role, please contact our support team.</p>
  <p>Best regards,<br>Innovation Hub Team</p>
</div>
    `

    await sendEmail(user.email, subject, text, html)
    
    res.status(200).json({
      status: 'success',
      message: 'User role updated successfully',
      data: {
        user: userWithoutPassword,
      },
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating user role',
    })
  }
}

export const userLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    const user = await UserService.getUserByEmail(email)
    if (!user) {
      res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      })
      return
    }

    if (!user.isActive) {
      res.status(403).json({
        status: 'fail',
        message: 'Oops, this account is deactivated',
      })
      return
    }

    if (!user.verified) {
      const token = await generateToken(user, '1h')
      const verificationLink = `${process.env.FRONTEND_URL}/api/users/verify-email?token=${token}`

      const subject = 'Innovation Hub - Email Verification Required'

      const text = `
Dear ${user.firstName},

We noticed that your email address is not yet verified. To secure your account and ensure full access to the Innovation Hub, please verify your email by clicking on the link below:

${verificationLink}

If you did not create an account with us, please ignore this message and Report.

Sincerely,
Innovation Hub Team
      `

      const html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">Innovation Hub - Email Verification Required</h2>
  <p>Dear ${user.firstName},</p>
  <p>We noticed that your email address is not yet verified. To secure your account and ensure full access to the Innovation Hub, please verify your email by clicking the button below:</p>
  <p>
    <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: #ffffff; text-decoration: none; border-radius: 4px;">
      Verify Email
    </a>
  </p>
  <p>If you did not create an account with us, please ignore this message and Report.</p>
  <p>Sincerely,<br>Innovation Hub Team</p>
</div>
      `

      await sendEmail(user.email, subject, text, html)
      res.status(403).json({
        message: 'This user is not verified. Check your email to verify your account.',
      })
      return
    }

    const isPasswordValid = await comparePassword(password, user.password)
    if (!isPasswordValid) {
      res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      })
      return
    }

    console.log(`User login: ${user.email} (${user.role}) at ${new Date().toISOString()}`)

    const token = await generateToken(user)

    const userWithoutPassword = { ...user.dataValues }
    delete userWithoutPassword.password

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token: token,
      data: {
        user: userWithoutPassword,
      },
    })
  } catch (error) {
    console.error('Error during login:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during login',
    })
  }
}

export const userLogout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (token) {
      await addToBlacklist(token)
    }

    res.status(200).json({
      status: 'success',
      message: 'User logged out successfully',
    })
  } catch (error) {
    next(error)
  }
}

export const changeAccountStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params

    const user = await UserService.getUserByid(id)
    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      })
      return
    }

    if (user.isActive && !req.body.activationReason) {
      res.status(403).json({
        status: 'fail',
        message: 'Deactivation reason is required',
      })
      return 
    }

    const subject = !user.isActive
      ? 'Innovation Hub - Account Activated'
      : 'Innovation Hub - Account Deactivated'
      
    const activationReason = !user.isActive
      ? 'Your account has been activated. You can now access all Innovation Hub features.'
      : req.body.activationReason

    sendReasonEmail(user, subject, activationReason, user.isActive)

    user.isActive = !user.isActive
    await user.save()

    res.status(201).json({
      message: 'Account status updated successfully',
      reason: activationReason,
    })
  } catch (error) {
    next(error)
  }
}

export const updatePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body
    const id = req.params.id

    const user = await UserService.getUserByid(id)
    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      })
      return 
    }

    const isPasswordValid = await comparePassword(oldPassword, user.password)
    if (!isPasswordValid) {
      res.status(401).json({
        status: 'fail',
        message: 'Enter correct old password',
      })
      return
    }

    const hashedPassword = await hashPassword(newPassword)
    user.password = hashedPassword
    await user.save()

    passwordEventEmitter.emit('passwordUpdated', user.id)

    const notificationMessage = 'Your password has been updated successfully';
    sendNotification(user.id, NotificationType.SECURITY, notificationMessage, user.id);

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
    })
  } catch (error) {
    console.error('Error updating password:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the password',
    })
  }
}

export const LoginViaGoogle = async (req: Request, res: Response) => {
  const user = req.user as UserSignupAttributes;
  try {
    // Ensure role is always "Admin" or "Member"
    const safeUser = { ...user, role: user.role ?? "Member" } as UserSignupAttributes & { role: "Admin" | "Member" };
    const token = await generateToken(safeUser);
    res.redirect(`${process.env.FRONTEND_URL}/auth/google/callback?token=${token}`);
  } catch (error) {
    res.status(500).json({ message: 'Error generating token' });
  }
};

export const googleRedirect = function () {
  return passport.authenticate('google', {
    successRedirect: '/auth/google/token',
    failureRedirect: '/auth/google/failure',
  })
}

export const googleAuthenticate = function () {
  return passport.authenticate('google', { scope: ['email', 'profile'] })
}

export const googleAuthFailed = function (_req: Request, res: Response) {
  res.status(400).json({ message: 'Authentication failed' })
}

export const requestPasswordReset = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body

    const user = await UserService.getUserByEmail(email)
    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      })
      return
    }

    const resetToken = await generateToken(user)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    const subject = 'Innovation Hub - Password Reset Request'

    const text = `
Dear ${user.firstName},

We received a request to reset your password for your Innovation Hub account. If you made this request, please click the link below to set a new password:

${resetLink}

If you did not request a password reset, you can ignore this message. Your account remains secure.

For any further assistance, feel free to contact our support team.

Best regards,
Innovation Hub Team
    `

    const html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">Innovation Hub - Password Reset Request</h2>
  <p>Dear ${user.firstName},</p>
  <p>We received a request to reset your password for your Innovation Hub account. If you made this request, please click the button below to set a new password:</p>
  <p>
    <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #e74c3c; color: #ffffff; text-decoration: none; border-radius: 4px;">
      Reset Password
    </a>
  </p>
  <p>If you did not request a password reset, you can ignore this message. Your account remains secure.</p>
  <p>For any further assistance, feel free to contact our support team.</p>
  <p>Best regards,<br>Innovation Hub Team</p>
</div>
    `

    await sendEmail(email, subject, text, html)

    res.status(200).json({
      status: 'success',
      message: 'Password reset email sent',
      data: { token: resetToken },
    })
  } catch (error) {
    console.error('Error requesting password reset:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while requesting password reset',
    })
  }
}

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const newPassword = req.body.newPassword
    const token = req.query.token as string
    const decoded: any = decodeToken(token)

    const user = await UserService.getUserByid(decoded.id)

    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'Invalid or expired token',
      })
      return 
    }

    const hashedPassword = await hashPassword(newPassword)
    user.password = hashedPassword
    await user.save()

    const notificationMessage = 'Your password has been reset successfully';
    sendNotification(user.id, NotificationType.SECURITY, notificationMessage, user.id);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while resetting password',
    })
  }
}

export const getAllUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; role: string };
    if (!currentUser || currentUser.role !== 'Admin') {
      res.status(403).json({
        status: 'fail',
        message: 'Access denied. Admin privileges required.',
      });
      return;
    }
    
    const users = await UserService.getAllUsers()
    const usersWithoutPasswords = users.map((user) => {
      const userWithoutPassword = { ...user.dataValues }
      delete userWithoutPassword.password
      return userWithoutPassword
    })

    res.status(200).json({
      status: 'success',
      data: {
        users: usersWithoutPasswords,
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching users',
    })
  }
}

export const getUserById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as { id: string })?.id; 
    if (!userId) {
      res.status(401).json({
        status: 'fail',
        message: 'Unauthorized: User not authenticated',
      });
      return;
    }

    const user = await UserService.getUserByid(userId);
    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
      return;
    }
    const userWithoutPassword = { ...user.dataValues }
    delete userWithoutPassword.password
  
    res.status(200).json({
      status: 'success',
      data: {
        user: userWithoutPassword,
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching users',
    })
  }
}

export const getProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userWithId = req.user as { id: string; [key: string]: any };
    if (!userWithId || !userWithId.id) {
      res.status(401).json({
        status: 'fail',
        message: 'Unauthorized: User not authenticated',
      });
      return;
    }
    const userId = userWithId.id;
    const user = await UserService.getUserByid(userId);

    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      })
      return 
    }

    const userWithoutPasswordId = { ...user.dataValues }
    delete userWithoutPasswordId.password
    delete userWithoutPasswordId.id

    console.log(`Profile accessed by: ${user.email} at ${new Date().toISOString()}`)

    res.status(200).json({
      status: 'success',
      data: userWithoutPasswordId,
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the profile',
    })
  }
}

export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as { id: string })?.id;
    const user = await UserService.getUserByid(userId);

    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
      return;
    }

    let imageUrl = user.image;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'innovation-hub',
        resource_type: 'auto',
      });
      imageUrl = result.secure_url;
    }

    const { firstName, lastName, phone, gender, email } = req.body;
    await user.update({
      firstName,
      lastName,
      phone,
      gender,
      email,
      image: imageUrl,
    });

    const notificationMessage = `Your profile has been updated successfully`;
    sendNotification(user.id, NotificationType.INFO, notificationMessage, user.id);
    
    console.log(`Profile updated by: ${user.email} (${user.firstName} ${user.lastName}) at ${new Date().toISOString()}`)
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        image: user.image,
        role: user.role
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the profile',
    });
  }
};

export const deleteUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    
    const currentUser = req.user as { id: string; role: string };
    if (currentUser.role !== 'Admin' && currentUser.id !== userId) {
      res.status(403).json({ 
        status: 'fail',
        message: "Access denied. You can only delete your own account." 
      });
      return;
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ 
        status: 'fail',
        message: "User not found" 
      });
      return;
    }
    
    await User.destroy({ where: { id: userId } });
    
    console.log(`User deleted: ${userId} by ${(req.user as any).email} at ${new Date().toISOString()}`)
    
    res.status(200).json({ 
      status: 'success',
      message: "User deleted successfully" 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: 'error',
      message: "Error deleting user" 
    });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({
        status: 'fail',
        message: 'No verification token provided',
      });
      return;
    }

    const decoded: any = decodeToken(token);
    if (!decoded || !decoded.id) {
      res.status(400).json({
        status: 'fail',
        message: 'Invalid verification token',
      });
      return;
    }

    const user = await UserService.getUserByid(decoded.id);
    if (!user) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
      return;
    }

    if (user.verified) {
      res.status(400).json({
        status: 'fail',
        message: 'Email already verified',
      });
      return;
    }

    user.verified = true;
    await user.save();

    const notificationMessage = `Welcome to Innovation Hub! Your email has been verified.`;
    sendNotification(user.id, NotificationType.NEW_REMINDER, notificationMessage, user.id);

    res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while verifying email',
    });
  }
};