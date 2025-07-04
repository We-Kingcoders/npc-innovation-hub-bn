import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { EventAttributes, EventCreationAttributes } from '../types/event.type';
import User from './user.model';

class Event 
  extends Model<EventAttributes, EventCreationAttributes> 
  implements EventAttributes 
{
  declare id: string;
  declare title: string;
  declare location: string;
  declare description: string;
  declare startTime: Date;
  declare endTime: Date;
  declare imageUrl: string;
  declare createdBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Event.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
      },
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterStart(value: Date) {
          if (new Date(value) <= new Date((this as any).startTime as Date)) {
            throw new Error('End time must be after start time');
          }
        },
      },
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updatedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
  },
  {
    sequelize: sequelize,
    modelName: 'Event',
    tableName: 'events',
    timestamps: true,
  }
);

// Create association with User
Event.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

export default Event;