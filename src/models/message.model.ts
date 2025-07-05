import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';
import Room from './room.model';

interface MessageAttributes {
  id: string;
  senderId: string;
  roomId: string;
  content: string;
  timestamp?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
  createdAt?: Date;
}

class Message extends Model<MessageAttributes> implements MessageAttributes {
  declare id: string;
  declare senderId: string;
  declare roomId: string;
  declare content: string;
  declare timestamp: Date;
  declare updatedAt: Date;
  declare isDeleted: boolean;
  declare createdAt: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'rooms',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Message',
    tableName: 'messages',
    timestamps: true,
  }
);

// Define relationships
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(Room, { foreignKey: 'roomId' });

User.hasMany(Message, { foreignKey: 'senderId' });
Room.hasMany(Message, { foreignKey: 'roomId' });

export default Message;