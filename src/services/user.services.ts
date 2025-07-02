/**
 * User Service
 * Provides methods for user management in the Innovation Hub
 * 
 * Last updated: 2025-07-01 15:13:45 UTC
 * Updated by: Alain275
 */

import User from "../models/user.model";
import { UserSignupAttributes, UserRole } from "../types/user.type";
import { Op } from "sequelize";

export class UserService {
  /**
   * Register a new user in the system
   * @param user User data for registration
   * @returns Newly created user
   */
  static async register(user: UserSignupAttributes) {
    // Default role to Member if not specified
    if (!user.role) {
      user.role = 'Member';
    }
    return await User.create(user);
  }

  /**
   * Save changes to an existing user
   * @param user User instance with updated data
   * @returns Updated user
   */
  static async updateUser(user: User) {
    return await user.save();
  }

  /**
   * Find a user by email address
   * @param email Email to search for
   * @returns User if found, null otherwise
   */
  static async getUserByEmail(email: string) {
    return await User.findOne({
      where: { email: email },
    });
  }

  /**
   * Find a user by ID
   * @param id User ID to search for
   * @returns User if found, null otherwise
   */
  static async getUserByid(id: string) {
    return await User.findOne({ 
      where: { id: id } 
    });
  }

  /**
   * Get all users in the system
   * @returns Array of all users
   */
  static async getAllUsers() {
    return await User.findAll();
  }

  /**
   * Update a user's role
   * @param id User ID
   * @param role New role (Admin or Member)
   * @returns Updated user or null if not found
   */
  static async updateRole(id: string, role: UserRole) {
    const user = await UserService.getUserByid(id);
    if (user) {
      user.role = role;
      await user.save();
      console.log(`[${new Date().toISOString()}] User ${id} role updated to ${role} by ${process.env.NODE_ENV === 'development' ? 'Alain275' : 'system'}`);
      return user;
    }
    return null;
  }

  /**
   * Get users by role
   * @param role Role to filter by
   * @returns Array of users with the specified role
   */
  static async getUsersByRole(role: UserRole) {
    return await User.findAll({
      where: { 
        role: role,
        isActive: true
      }
    });
  }

  /**
   * Search for users by name or email
   * @param searchTerm Term to search for
   * @returns Array of matching users
   */
  static async searchUsers(searchTerm: string) {
    return await User.findAll({
      where: {
        [Op.or]: [
          { firstName: { [Op.like]: `%${searchTerm}%` } },
          { lastName: { [Op.like]: `%${searchTerm}%` } },
          { email: { [Op.like]: `%${searchTerm}%` } }
        ],
        isActive: true
      }
    });
  }

  /**
   * Get active users count
   * @returns Number of active users
   */
  static async getActiveUsersCount() {
    return await User.count({
      where: { isActive: true }
    });
  }

  /**
   * Get distribution of users by role
   * @returns Object with count of users by role
   */
  static async getUserRoleDistribution() {
    const adminCount = await User.count({
      where: { 
        role: 'Admin',
        isActive: true
      }
    });
    
    const memberCount = await User.count({
      where: { 
        role: 'Member',
        isActive: true
      }
    });
    
    return {
      Admin: adminCount,
      Member: memberCount,
      total: adminCount + memberCount
    };
  }

  /**
   * Delete a user by ID
   * @param id User ID to delete
   * @returns Boolean indicating success
   */
  static async deleteUser(id: string) {
    const deleted = await User.destroy({
      where: { id: id }
    });
    
    if (deleted > 0) {
      console.log(`[${new Date().toISOString()}] User ${id} deleted by ${process.env.NODE_ENV === 'development' ? 'Alain275' : 'system'}`);
      return true;
    }
    return false;
  }
}