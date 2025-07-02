/**
 * User Type Definitions for Innovation Hub
 * 
 * Last updated: 2025-07-01 15:12:02 UTC
 * Updated by: Alain275
 */

import { Optional } from "sequelize";

/**
 * Core user attributes interface
 * Note: For authentication purposes, role should not be optional
 */
export interface UserAttributes {
  id?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  role: 'Admin' | 'Member'; // Made non-optional to fix restrictTo issues
  image?: string;
  password?: string;
  phone?: string;
  verified?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Attributes required for user signup
 * Makes most fields optional during the signup process
 */
export interface UserSignupAttributes
  extends Optional<
    UserAttributes,
    | "id"
    | "firstName"
    | "lastName"
    | "gender"
    | "password"
    | "email"
    | "image"
    | "role"  // Optional during signup, will default to 'Member'
    | "phone"
    | "updatedAt"
  > {}

/**
 * Full user output with all fields required
 * Used for returning complete user data
 */
export interface UserOutputs extends Required<UserAttributes> {}

/**
 * User with sensitive data removed for public API responses
 */
export interface SafeUserOutput extends Omit<UserAttributes, 'password'> {
  // Explicitly ensures password is never included
  password?: never;
}

/**
 * Role types for type safety across the application
 */
export type UserRole = 'Admin' | 'Member';

/**
 * User login credentials
 */
export interface UserLoginCredentials {
  email: string;
  password: string;
}

/**
 * ✅ Slim User type used in JWT payloads and Express middleware
 * This is used to attach to req.user (must include role)
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  [key: string]: any;
}
