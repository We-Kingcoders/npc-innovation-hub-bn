import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { AttendanceAttributes, AttendanceCreationAttributes } from '../types/attendance.type';
import User from './user.model';
import Event from './event.model';

class Attendance 
  extends Model<AttendanceAttributes, AttendanceCreationAttributes> 
  implements AttendanceAttributes 
{
  declare id: string;
  declare userId: string;
  declare eventId: string;
  declare status: 'going' | 'attended' | 'cancelled';
  declare createdAt: Date;
  declare updatedAt: Date;
}

Attendance.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('going', 'attended', 'cancelled'),
      allowNull: false,
      defaultValue: 'going',
      validate: {
        isIn: [['going', 'attended', 'cancelled']],
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
    modelName: 'Attendance',
    tableName: 'attendances',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'eventId'],
        name: 'user_event_unique',
      },
    ],
  }
);

// Create associations
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'attendee' });
Attendance.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

// Add reverse associations
User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendances' });
Event.hasMany(Attendance, { foreignKey: 'eventId', as: 'attendances' });

export default Attendance;