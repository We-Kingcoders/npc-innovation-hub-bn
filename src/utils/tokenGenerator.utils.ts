/**
 * Token Generator Utilities
 * Handles JWT token generation, verification, and management for Innovation Hub
 * 
 * Last updated: 2025-07-01 15:15:54 UTC
 * Updated by: Alain275
 */

import jwt, { Secret, SignOptions, JwtPayload } from "jsonwebtoken";
import { UserAttributes, UserRole } from "../types/user.type";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET: Secret = process.env.JWT_SECRET as string;
const REFRESH_SECRET: Secret = process.env.REFRESH_SECRET as string || JWT_SECRET;

// Standard token durations
const TOKEN_DURATIONS = {
  ACCESS: "1d",       // Access token duration
  REFRESH: "30d",     // Refresh token duration
  VERIFICATION: "1d", // Email verification token duration
  RESET: "15m",       // Password reset token duration
  TEMP: "5m"          // Temporary action token duration
};

// Token payload interface for better type safety
interface TokenPayload extends JwtPayload {
  id: string;
  role: UserRole;
  email: string;
  firstName: string;
  tokenType?: string;
}

/**
 * Generate a JWT token for a user
 * @param user User to generate token for
 * @param expiresIn Token expiration time (default: 1 day)
 * @param tokenType Type of token being generated
 * @returns JWT token string
 */
const generateToken = async (
  user: UserAttributes,
  expiresIn: string = TOKEN_DURATIONS.ACCESS,
  tokenType: string = "access"
): Promise<string> => {
  if (!user.id) {
    throw new Error("User ID is required to generate a token");
  }
  
  console.log(`[${new Date().toISOString()}] Generating ${tokenType} token for user: ${user.email || user.id}`);
  
  return jwt.sign(
    {
      role: user.role,
      email: user.email,
      id: user.id,
      firstName: user.firstName,
      tokenType: tokenType,
    } as TokenPayload,
    JWT_SECRET,
    {
      expiresIn,
      issuer: "innovation-hub-api",
    } as SignOptions
  );
};

/**
 * Generate a refresh token for a user
 * @param user User to generate refresh token for
 * @returns Refresh token string
 */
const generateRefreshToken = async (user: UserAttributes): Promise<string> => {
  return jwt.sign(
    {
      id: user.id,
      tokenType: "refresh"
    },
    REFRESH_SECRET,
    {
      expiresIn: TOKEN_DURATIONS.REFRESH,
      issuer: "innovation-hub-api",
    } as SignOptions
  );
};

/**
 * Decode and verify a JWT token
 * @param token Token to decode
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
const decodeToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Token verification failed: ${(error as Error).message}`);
    throw new Error("Invalid or expired token");
  }
};

/**
 * Verify a refresh token
 * @param token Refresh token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Refresh token verification failed: ${(error as Error).message}`);
    throw new Error("Invalid or expired refresh token");
  }
};

/**
 * Check if a token is valid without throwing an exception
 * @param token Token to validate
 * @returns Boolean indicating if token is valid
 */
const isTokenValid = (token: string): boolean => {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Generate a verification token for email verification
 * @param user User to generate verification token for
 * @returns Verification token string
 */
const generateVerificationToken = async (user: UserAttributes): Promise<string> => {
  return generateToken(user, TOKEN_DURATIONS.VERIFICATION, "verification");
};

/**
 * Generate a password reset token
 * @param user User to generate reset token for
 * @returns Reset token string
 */
const generateResetToken = async (user: UserAttributes): Promise<string> => {
  return generateToken(user, TOKEN_DURATIONS.RESET, "reset");
};

export {
  generateToken,
  decodeToken,
  generateRefreshToken,
  verifyRefreshToken,
  isTokenValid,
  generateVerificationToken,
  generateResetToken,
  TOKEN_DURATIONS,
  type TokenPayload
};