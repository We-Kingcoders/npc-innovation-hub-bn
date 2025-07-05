/**
 * Room Participant Model
 * Represents users who are part of a chat room
 * 
 * @created_by Alain275
 * @created_at 2025-07-05 15:25:50 UTC
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';
import Room from './room.model';

interface RoomParticipantAttributes {
  userId: string;
  roomId: string;
  joinedAt?: Date;
  lastRead?: Date; // Tracks when the user last read messages in this room
  createdAt?: Date;
  updatedAt?: Date;
}

class RoomParticipant extends Model<RoomParticipantAttributes> implements RoomParticipantAttributes {
  declare userId: string;
  declare roomId: string;
  declare joinedAt: Date;
  declare lastRead: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

RoomParticipant.init(
  {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'rooms',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    lastRead: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'RoomParticipant',
    tableName: 'room_participants',
    timestamps: true,
  }
);

// Define relationships
User.belongsToMany(Room, {
  through: RoomParticipant,
  foreignKey: 'userId',
  otherKey: 'roomId',
});

Room.belongsToMany(User, {
  through: RoomParticipant,
  foreignKey: 'roomId',
  otherKey: 'userId',
});

export default RoomParticipant;