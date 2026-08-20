import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

interface ApplicationAttributes {
  id: string;
  imageUrl: string | null;
  fullName: string;
  email: string;
  githubUrl: string;
  skills: string[];
  phoneNumber: string;
  gender: 'Male' | 'Female' | 'Other';
  strengths: string;
  weaknesses: string;
  applicationLetterUrl: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type ApplicationCreationAttributes = Optional<
  ApplicationAttributes,
  'id' | 'imageUrl' | 'status' | 'reviewedBy' | 'reviewedAt' | 'createdAt' | 'updatedAt'
>;

class Application
  extends Model<ApplicationAttributes, ApplicationCreationAttributes>
  implements ApplicationAttributes
{
  declare id: string;
  declare imageUrl: string | null;
  declare fullName: string;
  declare email: string;
  declare githubUrl: string;
  declare skills: string[];
  declare phoneNumber: string;
  declare gender: 'Male' | 'Female' | 'Other';
  declare strengths: string;
  declare weaknesses: string;
  declare applicationLetterUrl: string;
  declare status: 'Pending' | 'Accepted' | 'Rejected';
  declare reviewedBy: string | null;
  declare reviewedAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Application.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true, notEmpty: true },
    },
    githubUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isUrl: true, notEmpty: true },
    },
    skills: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    gender: {
      type: DataTypes.ENUM('Male', 'Female', 'Other'),
      allowNull: false,
    },
    strengths: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
    weaknesses: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
    applicationLetterUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Accepted', 'Rejected'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
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
    modelName: 'Application',
    tableName: 'applications',
    timestamps: true,
  }
);

Application.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

export default Application;
