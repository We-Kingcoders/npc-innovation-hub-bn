import Room from '../models/room.model';
import RoomParticipant from '../models/roomParticipant.model';
import User from '../models/user.model';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

export class RoomService {
  /**
   * Get the Hub Community room (creates it if it doesn't exist)
   */
  static async getHubRoom(): Promise<Room> {
    // Try to find the hub room first
    let hubRoom = await Room.findOne({
      where: {
        name: 'Hub Community',
        isGroup: true
      }
    });

    // If the hub room doesn't exist yet, create it with the first admin as leader
    if (!hubRoom) {
      const admin = await User.findOne({
        where: { role: 'Admin' }
      });

      if (!admin) {
        throw new Error('Cannot create Hub room: No admin found in the system');
      }

      // Create room with explicitly generated UUID
      hubRoom = await Room.create({
          name: 'Hub Community',
          isGroup: true,
          leaderId: admin.id,
          id: uuidv4() // Generate proper UUID instead of empty string
      });
    }

    return hubRoom;
  }

  /**
   * Add a user to a room (primarily used for adding to the Hub)
   */
  static async addUserToRoom(userId: string, roomId: string): Promise<RoomParticipant> {
    // Check if the user is already in the room
    const existingParticipant = await RoomParticipant.findOne({
      where: {
        userId,
        roomId
      }
    });

    if (existingParticipant) {
      return existingParticipant;
    }

    // Add the user to the room
    return RoomParticipant.create({
      userId,
      roomId,
      joinedAt: new Date()
    });
  }

  /**
   * Remove a user from a room
   */
  static async removeUserFromRoom(userId: string, roomId: string): Promise<boolean> {
    const result = await RoomParticipant.destroy({
      where: {
        userId,
        roomId
      }
    });

    return result > 0;
  }

  /**
   * Get all participants in a room
   */
  static async getRoomParticipants(roomId: string): Promise<User[]> {
    const participants = await RoomParticipant.findAll({
      where: { roomId },
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'role']
        }
      ]
    });

    return participants.map((p: any) => p.User);
  }

  /**
   * Check if user is in a room
   */
  static async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    const participant = await RoomParticipant.findOne({
      where: {
        userId,
        roomId
      }
    });

    return participant !== null;
  }

  /**
   * Get rooms where a user is a participant
   */
  static async getUserRooms(userId: string): Promise<Room[]> {
    const participants = await RoomParticipant.findAll({
      where: { userId },
      include: [
        {
          model: Room
        }
      ]
    });

    return participants.map((p: any) => p.Room);
  }

  /**
   * Update user's last read timestamp in a room
   */
  static async updateLastRead(userId: string, roomId: string): Promise<void> {
    await RoomParticipant.update(
      { lastRead: new Date() },
      {
        where: {
          userId,
          roomId
        }
      }
    );
  }
}

export default RoomService;