import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { protectRoute, restrictTo } from '../middlewares/auth.middleware';
import { verifyEmail } from '../controllers/user.controller';
import { verifyTokenMiddleware } from '../middlewares/verifyToken.middleware';
import upload from '../utils/multerConfig';
import {
  updateRole,
  userSignup,
  userLogin,
  userLogout,
  changeAccountStatus,
  updatePassword,
  requestPasswordReset,
  resetPassword,
  deleteUserById,
  getAllUsers,
  getUserById,
  getProfile,
  updateProfile,
} from '../controllers/user.controller';
import {
  validateUser,
  validateUserLogin,
  validateUserUpdatePassword,
} from '../validations/user.validation';
import { resendOTP, verifyOTP } from '../middlewares/otp.middleware';
import { loginWithGoogleToken } from '../controllers/user.controller';
import {
  authGuessLimiter,
  emailSendLimiter,
  signupLimiter,
} from '../middlewares/rateLimit.middleware';

const userRoutes = express.Router();

userRoutes.post('/signup', signupLimiter, validateUser, userSignup);

// restrictTo('Admin') added declaratively here - both were previously
// Admin-gated only inside their own controllers (updateRole/
// changeAccountStatus in user.controller.ts, which keep that check too),
// not at the route. deleteUserById is intentionally left without
// restrictTo: unlike these two, it's owner-OR-admin (a user can delete
// their own account), so an Admin-only route guard would break that.
userRoutes.patch('/:id/role', protectRoute, restrictTo('Admin'), updateRole);
userRoutes.patch('/change-account-status/:id', protectRoute, restrictTo('Admin'), changeAccountStatus);

userRoutes.delete('/:id', protectRoute, deleteUserById);

userRoutes.post('/login', authGuessLimiter, validateUserLogin, userLogin);
userRoutes.post('/logout', protectRoute, userLogout);
userRoutes.get('/users', protectRoute, getAllUsers);
userRoutes.get('/me', protectRoute, getUserById);

userRoutes.patch('/:id/update-password', protectRoute, validateUserUpdatePassword, updatePassword);
userRoutes.get('/profile', protectRoute, getProfile);
// upload.single() now enforces a file-type/size fileFilter (see
// multerConfig.ts) that previously didn't exist - without this wrapper,
// a rejected upload (wrong type, too large) would fall through to
// Express's default error handler (there's no global one in this app)
// instead of the clean JSON error response every other endpoint returns.
const uploadProfileImage = (req: Request, res: Response, next: NextFunction) => {
  void upload.single('images')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof multer.MulterError ? err.message : (err as Error).message;
      res.status(400).json({ status: 'fail', message });
      return;
    }
    next();
  });
};

userRoutes.patch('/update-profile', protectRoute, uploadProfileImage, updateProfile);
userRoutes.post('/request-password-reset', emailSendLimiter, requestPasswordReset);
userRoutes.post('/reset-password', authGuessLimiter, resetPassword);
userRoutes.get('/verify-email', verifyTokenMiddleware, verifyEmail);

// OTP routes for all users (Member, Admin, etc.)
userRoutes.post('/send-otp', emailSendLimiter, resendOTP); // <---- Route to send OTP
// A 6-digit OTP is only ~900,000 combinations - the strict guess limiter is
// what actually makes that safe against brute force, since nothing else
// throttles repeated guesses.
userRoutes.post('/verify-otp', authGuessLimiter, verifyOTP);

// Initiate Google OAuth authentication (matches /api/users/auth/google)
userRoutes.post('/auth/google/auth', loginWithGoogleToken);

export default userRoutes;
