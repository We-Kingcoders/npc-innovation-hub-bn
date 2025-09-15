import jwt, { Secret, SignOptions, JwtPayload } from "jsonwebtoken";
import { UserAttributes, UserRole } from "../types/user.type";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET: Secret = process.env.JWT_SECRET as string;
const REFRESH_SECRET: Secret = process.env.REFRESH_SECRET as string || JWT_SECRET;

// Standard token durations
const TOKEN_DURATIONS = {
  ACCESS: "7d",        // Access token duration (7 days)
  REFRESH: "60d",      // Refresh token duration (60 days)
  VERIFICATION: "1d",  // Email verification token duration
  RESET: "30m",        // Password reset token duration
  TEMP: "10m"          // Temporary action token duration
};

// Token payload interface for type safety
interface TokenPayload extends JwtPayload {
  id: string;
  role: UserRole;
  email: string;
  firstName: string;
  tokenType?: string;
}

/**
 * Generate a JWT token for a user
 */
const generateToken = async (
  user: UserAttributes,
  expiresIn: string = TOKEN_DURATIONS.ACCESS,
  tokenType: string = "access"
): Promise<string> => {
  if (!user.id) throw new Error("User ID is required to generate a token");

  console.log(`[${new Date().toISOString()}] Generating ${tokenType} token for user: ${user.email || user.id}, expires in: ${expiresIn}`);

  return jwt.sign(
    {
      role: user.role,
      email: user.email,
      id: user.id,
      firstName: user.firstName,
      tokenType: tokenType,
    } as TokenPayload,
    JWT_SECRET,
    { expiresIn, issuer: "innovation-hub-api" } as SignOptions
  );
};

/**
 * Generate a refresh token for a user
 */
const generateRefreshToken = async (user: UserAttributes): Promise<string> => {
  console.log(`[${new Date().toISOString()}] Generating refresh token for user: ${user.email || user.id}, expires in: ${TOKEN_DURATIONS.REFRESH}`);
  
  return jwt.sign(
    { id: user.id, tokenType: "refresh" },
    REFRESH_SECRET,
    { expiresIn: TOKEN_DURATIONS.REFRESH, issuer: "innovation-hub-api" } as SignOptions
  );
};

/**
 * Decode and verify a JWT token
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
 */
const isTokenValid = (token: string): boolean => {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
};

/**
 * Generate a verification token for email verification
 */
const generateVerificationToken = async (user: UserAttributes): Promise<string> => {
  return generateToken(user, TOKEN_DURATIONS.VERIFICATION, "verification");
};

/**
 * Generate a password reset token
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
