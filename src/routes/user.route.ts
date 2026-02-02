import express from "express";
import { protectRoute, restrictTo } from "../middlewares/auth.middleware";
import { verifyEmail } from "../controllers/user.controller";
import { verifyTokenMiddleware } from "../middlewares/verifyToken.middleware";
import upload from "../utils/multerConfig";
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
} from "../controllers/user.controller";
import * as UserController from "../controllers/user.controller";
import {
  validateUser,
  validateUserLogin,
  validateUserUpdatePassword,
} from "../validations/user.validation";
import { sendOTP, verifyOTP } from "../middlewares/otp.middleware";
import { loginWithGoogleToken } from '../controllers/user.controller';

const userRoutes = express.Router();

userRoutes.post("/signup", validateUser, userSignup);

userRoutes.patch(
  "/:id/role",
  protectRoute,
  updateRole
);
userRoutes.patch(
  "/change-account-status/:id",
  protectRoute,
  changeAccountStatus
);
userRoutes.delete(
  '/delete',
  protectRoute,
  deleteUserById,
)
userRoutes.post("/login", validateUserLogin, userLogin);
userRoutes.post("/logout", protectRoute, userLogout);
userRoutes.get(
  '/users',
  protectRoute,
  getAllUsers,
)
userRoutes.get(
  '/me',
  protectRoute,
  getUserById,
)

userRoutes.patch(
  "/:id/update-password",
  protectRoute,
  validateUserUpdatePassword,
  updatePassword
);
userRoutes.get("/profile", protectRoute, getProfile);
userRoutes.patch("/update-profile", protectRoute, upload.single("images"), updateProfile);
userRoutes.post("/request-password-reset", requestPasswordReset);
userRoutes.post("/reset-password", resetPassword);
userRoutes.get("/verify-email", verifyTokenMiddleware, verifyEmail);

// OTP routes for all users (Member, Admin, etc.)
userRoutes.post("/send-otp", sendOTP); // <---- Route to send OTP
userRoutes.post("/verify-otp", verifyOTP);  

// userRoutes.get('/allow-states', protectRoute, UserController.getAllAllowStates);
// userRoutes.patch(
//   '/update-allow/:id',
//   protectRoute,
//   UserController.updateAllowState
// );
// Initiate Google OAuth authentication (matches /api/users/auth/google)
userRoutes.post('/auth/google/auth', loginWithGoogleToken);

export default userRoutes; 