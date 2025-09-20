import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/database'
import { BlogAttributes, BlogCreationAttributes } from '../types/blog.type'
import User from './user.model'

class Blog 
  extends Model<BlogAttributes, BlogCreationAttributes>
  implements BlogAttributes
{
  declare id: string      
  declare title: string
  declare content: string
  declare summary: string
  declare image: string
  declare category: 'Cyber security' | 'Front-end' | 'Back-end'
  declare authorId: string
  declare isPublished: boolean
  declare viewCount: number
  declare createdAt: Date
  declare updatedAt: Date
}

Blog.init(
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    summary: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM('Cyber security', 'Front-end', 'Back-end'),
      allowNull: false,
      validate: {
        isIn: [['Cyber security', 'Front-end', 'Back-end']],
      },
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    modelName: 'Blog',
    tableName: 'blogs',
    timestamps: true,
  }
)

// Define association with User model
Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' })

export default Blog