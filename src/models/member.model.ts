import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { MemberAttributes , MemberSignupAttributes } from '../types/member.type';
import User from './user.model';

// Extend attributes to include innovation metrics
interface MemberAttrs extends MemberAttributes {
  contributionScore?: number;
  innovationPoints?: number;
  projectsCompleted?: number;
}

type MemberCreation = Optional<MemberAttrs, 'id' | 'contributionScore' | 'innovationPoints' | 'projectsCompleted'>;

class Member
  extends Model<MemberAttrs, MemberCreation>
  implements MemberAttrs
{
  declare id: string;
  declare userId: string;
  declare membershipLevel: string;
  declare company: string;
  declare position: string;
  declare industry: string;
  declare bio: string;
  declare skills: string[];
  declare website: string;
  declare linkedIn: string;
  declare github: string;
  declare memberSince: Date;
  declare membershipExpiry: Date;
  declare lastActive: Date;
  declare contributionScore: number;
  declare innovationPoints: number;
  declare projectsCompleted: number;
  declare eventsAttended: number;
  declare mentorId: string;
  declare isMentor: boolean;
  declare specializations: string[];
  declare availabilityHours: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  static associate() {
    this.belongsTo(User, { foreignKey: 'userId' });
  }
}

Member.init(
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
    },
    membershipLevel: {
      type: DataTypes.ENUM('Basic', 'Premium', 'Enterprise'),
      allowNull: false,
      defaultValue: 'Basic',
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    linkedIn: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    github: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    memberSince: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    membershipExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    lastActive: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    contributionScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
      comment: 'Overall contribution score in the hub',
    },
    innovationPoints: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Points earned through innovation activities',
    },
    projectsCompleted: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    eventsAttended: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    mentorId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of assigned mentor if applicable',
    },
    isMentor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    specializations: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      comment: 'Areas of expertise for mentoring',
    },
    availabilityHours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Hours available per week for hub activities',
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
    sequelize,
    modelName: 'Member',
    tableName: 'members',
    timestamps: true,
  }
);

export default Member;