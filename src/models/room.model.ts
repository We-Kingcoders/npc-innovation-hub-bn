import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

interface RoomAttributes {
  id: string;
  name: string;
  isGroup: boolean;
  leaderId: string; // The admin who manages this room
  createdAt?: Date;
  updatedAt?: Date;
}

class Room extends Model<RoomAttributes> implements RoomAttributes {
  declare id: string;
  declare name: string;
  declare isGroup: boolean;
  declare leaderId: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Room.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Hub Community',
    },
    isGroup: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    leaderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Room',
    tableName: 'rooms',
    timestamps: true,
  }
);

// Define relationship with User (leader)
Room.belongsTo(User, { as: 'leader', foreignKey: 'leaderId' });

export default Room;