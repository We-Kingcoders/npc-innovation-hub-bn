import express from "express";
import { protectRoute, restrictTo } from "../middlewares/auth.middleware";
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
  verifyEmail,
  LoginViaGoogle,
  googleRedirect,
  googleAuthenticate,
  googleAuthFailed
} from "../controllers/user.controller";
import {
  validateUser,
  validateUserLogin,
  validateUserUpdatePassword,
} from "../validations/user.validation";
import { verifyOTP } from "../middlewares/otp.middleware";

const userRoutes = express.Router();

// ========== User Authentication ==========
userRoutes.post("/signup", validateUser, userSignup);
userRoutes.post("/login", validateUserLogin, userLogin);
userRoutes.post("/logout", protectRoute, userLogout);

// ========== Google OAuth ==========
userRoutes.get("/auth/google", googleAuthenticate());
userRoutes.get("/auth/google/callback", googleRedirect());
userRoutes.get("/auth/google/token", LoginViaGoogle);
userRoutes.get("/auth/google/failure", googleAuthFailed);

// ========== Email and OTP Verification ==========
userRoutes.get("/verify-email", verifyTokenMiddleware, verifyEmail);
userRoutes.post("/verify-otp", verifyOTP);

// ========== User Profile ==========
userRoutes.get("/profile", protectRoute, getProfile);
userRoutes.get("/me", protectRoute, getUserById);
userRoutes.patch("/update-profile", protectRoute, upload.single("images"), updateProfile);

// ========== Password Management ==========
userRoutes.patch(
  "/:id/update-password",
  protectRoute,
  validateUserUpdatePassword,
  updatePassword
);
userRoutes.post("/request-password-reset", requestPasswordReset);
userRoutes.post("/reset-password", resetPassword);

// ========== Admin Management ==========
userRoutes.get(
  "/users",
  protectRoute,
  restrictTo("Admin"),
  getAllUsers
);
userRoutes.patch(
  "/:id/role",
  protectRoute,
  restrictTo("Admin"),
  updateRole
);
userRoutes.patch(
  "/change-account-status/:id",
  protectRoute,
  restrictTo("Admin"),
  changeAccountStatus
);

// ========== Delete User ==========
userRoutes.delete(
  "/:id",
  protectRoute,
  deleteUserById
);

export default userRoutes;
