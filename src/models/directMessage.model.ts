import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

interface DirectMessageAttributes {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp?: Date;
  updatedAt?: Date;
  isRead?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
}

class DirectMessage extends Model<DirectMessageAttributes> implements DirectMessageAttributes {
  declare id: string;
  declare senderId: string;
  declare receiverId: string;
  declare content: string;
  declare timestamp: Date;
  declare updatedAt: Date;
  declare isRead: boolean;
  declare isDeleted: boolean;
  declare createdAt: Date;
}

DirectMessage.init(
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
    receiverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
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
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'DirectMessage',
    tableName: 'direct_messages',
    timestamps: true,
    indexes: [
      {
        fields: ['senderId', 'receiverId'],
        name: 'dm_participants_index',
      },
    ],
  }
);

// Add hook to prevent empty UUID strings
DirectMessage.beforeCreate((instance: any) => {
  // If id is empty string, set it to null so Postgres generates it
  if (instance.id === '') {
    instance.id = null;
  }
});

// Define relationships
DirectMessage.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
DirectMessage.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

User.hasMany(DirectMessage, { as: 'sentMessages', foreignKey: 'senderId' });
User.hasMany(DirectMessage, { as: 'receivedMessages', foreignKey: 'receiverId' });

export default DirectMessage;