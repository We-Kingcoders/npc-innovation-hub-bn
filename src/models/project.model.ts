import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

// Define project attributes
interface ProjectAttributes {
  id: string;
  userId: string;
  title: string;
  description: string;
  owner: string;
  ownerRole: string;
  ownerAvatar: string;
  image: string;
  link: string;
  demo: string;
  createdAt: Date;
  updatedAt: Date;
}

type ProjectCreationAttributes = Optional<ProjectAttributes, 'id' | 'ownerRole' | 'ownerAvatar' | 'image'>;

class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  declare id: string;
  declare userId: string;
  declare title: string;
  declare description: string;
  declare owner: string;
  declare ownerRole: string;
  declare ownerAvatar: string;
  declare image: string;
  declare link: string;
  declare demo: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Project.init(
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    owner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ownerRole: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Project owner',
    },
    ownerAvatar: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'https://randomuser.me/api/portraits/lego/1.jpg',
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600',
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    demo: {
      type: DataTypes.STRING,
      allowNull: true,
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
    modelName: 'Project',
    tableName: 'projects',
    timestamps: true,
  }
);

// Define the association
Project.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Project, { foreignKey: 'userId' });

export default Project;