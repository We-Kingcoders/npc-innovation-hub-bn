/**
 * Variable Utilities
 * Contains constants and configuration values for the Innovation Hub platform
 * 
 * Last updated: 2025-07-01 15:29:55 UTC
 * Updated by: Alain275
 */

import dotenv from "dotenv";

dotenv.config();

/**
 * Common user messages displayed throughout the application
 */
export const USER_MESSAGES = {
    // Authentication messages
    INVALID_TOKEN: "Invalid token",
    USER_NOT_FOUND: "User not found",
    EMAIL_VERIFIED: "Email verified successfully",
    LOGIN_SUCCESS: "Login successful",
    LOGIN_FAILED: "Invalid email or password",
    LOGOUT_SUCCESS: "User logged out successfully",
    EMAIL_SENT: "Email sent successfully",
    ACCOUNT_CREATED: "Account created successfully",
    PASSWORD_RESET: "Password reset successfully",
    PASSWORD_UPDATED: "Password updated successfully",
    
    // Authorization messages
    UNAUTHORIZED: "You are not authorized to perform this action",
    ACCESS_DENIED: "Access denied",
    ADMIN_REQUIRED: "Admin privileges required",
    
    // Validation messages
    VALIDATION_ERROR: "Validation error",
    REQUIRED_FIELDS: "Please fill in all required fields",
    INVALID_EMAIL: "Please provide a valid email address",
    PASSWORD_REQUIREMENTS: "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character",
    
    // Error messages
    INTERNAL_SERVER_ERROR: "Internal server error",
    SERVICE_UNAVAILABLE: "Service temporarily unavailable",
    NOT_FOUND: "Resource not found",
    DUPLICATE_ENTRY: "This resource already exists",
    
    // Success messages
    PROFILE_UPDATED: "Profile updated successfully",
    ROLE_UPDATED: "User role updated successfully",
};

/**
 * JWT token configuration
 */
export const JWT_CONSTANTS = {
    SECRET_KEY: process.env.JWT_SECRET || "", // Secret key for JWT
    REFRESH_SECRET_KEY: process.env.REFRESH_SECRET || "", // Secret key for refresh tokens
    AUTH_TOKEN_EXPIRY: "1d", // 1 day for access token expiry
    REFRESH_TOKEN_EXPIRY: "30d", // 30 days for refresh token expiry
    VERIFICATION_TOKEN_EXPIRY: "1d", // 1 day for email verification token
    RESET_TOKEN_EXPIRY: "15m", // 15 minutes for password reset token
    TEMP_TOKEN_EXPIRY: "5m", // 5 minutes for temporary actions
};

/**
 * Test data for unit and integration testing
 */
export const TEST_DATA = {
    // Test user
    USER_ID: "test-user-id-123",
    USER_EMAIL: "test@innovationhub.example.com",
    ADMIN_EMAIL: "admin@innovationhub.example.com",
    INVALID_EMAIL: "not-an-email@example.com",
    
    // Test tokens
    VALID_TOKEN: "valid-test-token",
    INVALID_TOKEN: "invalid-test-token",
    EXPIRED_TOKEN: "expired-test-token",
    
    // Test content
    TEST_STRING: "Innovation Hub Test String",
    TEST_DESCRIPTION: "This is a test description for the Innovation Hub platform",
};

/**
 * API routes for the application
 */
export const ROUTES = {
    // Auth routes
    LOGIN: "/api/users/login",
    LOGOUT: "/api/users/logout",
    SIGNUP: "/api/users/signup",
    VERIFY_EMAIL: "/api/users/verify-email",
    RESET_PASSWORD: "/api/users/reset-password",
    REFRESH_TOKEN: "/api/users/refresh-token",
    
    // User routes
    USERS: "/api/users",
    USER_PROFILE: "/api/users/profile",
    
    // Other routes
    HEALTH_CHECK: "/api/health",
    DOCUMENTATION: "/api/docs",
};

/**
 * User roles and their capabilities
 */
export const USER_ROLES = {
    ADMIN: "Admin", // Can manage users and all content
    MEMBER: "Member", // Regular user with standard permissions
};

/**
 * Account status related messages
 */
export const AccountStatusMessages = {
    ACCOUNT_ENABLED_SUBJECT: "Innovation Hub - Account Activated",
    ACCOUNT_DISABLED_SUBJECT: "Innovation Hub - Account Deactivated",
    DEFAULT_ACTIVATION_REASON: "Your account has been activated. You can now access all Innovation Hub features."
};

/**
 * File upload configurations
 */
export const UPLOAD_CONFIG = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif"],
    ALLOWED_DOCUMENT_TYPES: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    MAX_FILES_PER_REQUEST: 5,
    UPLOAD_DIRECTORY: "uploads/",
};

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE: /^\+?[0-9]{10,15}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
};

/**
 * Pagination defaults
 */
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
};

/**
 * Feature flags for enabling/disabling features
 */
export const FEATURE_FLAGS = {
    ENABLE_GOOGLE_AUTH: process.env.ENABLE_GOOGLE_AUTH === "true",
    ENABLE_EMAIL_VERIFICATION: process.env.ENABLE_EMAIL_VERIFICATION !== "false",
    ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== "false",
    MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === "true",
};

/**
 * Application metadata
 */
export const APP_META = {
    NAME: "Innovation Hub",
    VERSION: process.env.APP_VERSION || "1.0.0",
    ENVIRONMENT: process.env.NODE_ENV || "development",
    DEPLOYED_AT: "2025-07-01",
    LAST_UPDATED_BY: "Alain275",
};

// Log module initialization
console.log(`[2025-07-01 15:29:55] Variable utils initialized by Alain275`);