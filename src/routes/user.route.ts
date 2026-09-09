import express from 'express';
import { protectRoute } from '../middlewares/auth.middleware';
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
import { sendOTP, verifyOTP } from '../middlewares/otp.middleware';
import { loginWithGoogleToken } from '../controllers/user.controller';
import {
  authGuessLimiter,
  emailSendLimiter,
  signupLimiter,
} from '../middlewares/rateLimit.middleware';

const userRoutes = express.Router();

userRoutes.post('/signup', signupLimiter, validateUser, userSignup);

userRoutes.patch('/:id/role', protectRoute, updateRole);
userRoutes.patch('/change-account-status/:id', protectRoute, changeAccountStatus);

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
userRoutes.post('/send-otp', emailSendLimiter, sendOTP); // <---- Route to send OTP
// A 6-digit OTP is only ~900,000 combinations - the strict guess limiter is
// what actually makes that safe against brute force, since nothing else
// throttles repeated guesses.
userRoutes.post('/verify-otp', authGuessLimiter, verifyOTP);

// Initiate Google OAuth authentication (matches /api/users/auth/google)
userRoutes.post('/auth/google/auth', loginWithGoogleToken);

export default userRoutes;
