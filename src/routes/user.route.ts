import express from 'express';
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
userRoutes.patch('/update-profile', protectRoute, upload.single('images'), updateProfile);
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
