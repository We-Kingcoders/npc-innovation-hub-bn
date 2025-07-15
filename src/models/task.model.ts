import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'
import User from './user.model'

export interface TaskAttributes {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  githubIssueLink?: string
  dueDate: Date
  createdBy: string // Admin's User ID (UUID)
  assignedTo?: string | null // Member's User ID (UUID) or null
  createdAt?: Date
  updatedAt?: Date
}

export interface TaskCreationAttributes extends Optional<TaskAttributes, 'id' | 'githubIssueLink' | 'assignedTo'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  declare id: string
  declare title: string
  declare description: string
  declare status: 'pending' | 'in-progress' | 'completed'
  declare priority: 'low' | 'medium' | 'high'
  declare githubIssueLink?: string
  declare dueDate: Date
  declare createdBy: string
  declare assignedTo?: string | null
  declare createdAt?: Date
  declare updatedAt?: Date
}

Task.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'in-progress', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
    },
    githubIssueLink: { type: DataTypes.STRING, allowNull: true },
    dueDate: { type: DataTypes.DATE, allowNull: false },
    createdBy: { type: DataTypes.UUID, allowNull: false, references: { model: User, key: 'id' } },
    assignedTo: { type: DataTypes.UUID, allowNull: true, references: { model: User, key: 'id' } },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Task',
    tableName: 'tasks',
    timestamps: true,
  }
)

// Associations
Task.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' })
Task.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' })

export default Task