import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

// Define education interface
interface Education {
  degree: string;
  institution: string;
  department?: string;
  description: string;
  imageUrl: string;
  startYear?: number;
  endYear?: number | null;
  status?: string;
}

// Define contacts interface
interface Contacts {
  linkedin: string;
  github: string;
  twitter?: string;
  instagram?: string;
  portfolio?: string;
}

// Define skill interface
interface Skill {
  name: string;
  technologies: string[];
  percent: number;
  category?: 'Frontend Development' | 'Backend Development' | 'DevOps & Tools' | 'Mobile & Other' | 'Other';
}

// Define language interface
interface Language {
  name: string;
  level: 'Native' | 'Fluent' | 'Intermediate' | 'Basic';
}

// Define member attributes
interface MemberAttributes {
  id: string;
  userId: string;
  name: string;
  role: string;
  imageUrl: string;
  bio: string;
  education?: Education;
  contacts?: Contacts;
  skillDetails?: Skill[];
  skills: string[];
  languages?: Language[];
  cvUrl?: string | null;
  resumeUrl?: string | null;
  tagline?: string | null;
  hashtags?: string[];
  availability: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type MemberCreationAttributes = Optional<
  MemberAttributes,
  'id' | 'education' | 'contacts' | 'skillDetails' | 'bio' | 'languages' | 'cvUrl' | 'resumeUrl' | 'tagline' | 'hashtags' | 'availability'
>;

class Member extends Model<MemberAttributes, MemberCreationAttributes> implements MemberAttributes {
  declare id: string;
  declare userId: string;
  declare name: string;
  declare role: string;
  declare imageUrl: string;
  declare bio: string;
  declare education: Education;
  declare contacts: Contacts;
  declare skillDetails: Skill[];
  declare skills: string[];
  declare languages: Language[];
  declare cvUrl: string | null;
  declare resumeUrl: string | null;
  declare tagline: string | null;
  declare hashtags: string[];
  declare availability: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '/members-images/member-demo.jpg',
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    education: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    contacts: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    skillDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    languages: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    cvUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    resumeUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    tagline: {
      type: DataTypes.STRING(160),
      allowNull: true,
      defaultValue: null,
    },
    hashtags: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    availability: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

// Define the association directly after initialization
Member.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Member, { foreignKey: 'userId' });

export default Member;