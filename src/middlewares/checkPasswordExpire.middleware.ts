import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.services';

const PASSWORD_EXPIRATION_DAYS = parseInt(process.env.PASSWORD_EXPIRATION_DAYS || '90');

// Import the User type and extend the Request interface to include user of type User
// import the correct User type or interface from user.type
import type { User } from '../types/user.type';
// If 'User' is not exported as named, use:
// import User from '../types/user.type';

interface AuthenticatedRequest extends Request {
  user: User;
}

export const checkPasswordExpiry = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "User not authenticated",
      });
    }
    const userId = req.user.id; 

    const user = await UserService.getUserByid(userId);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    const now = new Date();
    const lastUpdate = new Date(user.updatedAt);
    const diffDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= PASSWORD_EXPIRATION_DAYS) {
      return res.status(403).json({
        status: "fail",
        message: "Password update is required to proceed with other actions",
      });
    }

    next();
  } catch (error) {
    console.error("Error checking password update:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while checking password update",
    });
  }
};