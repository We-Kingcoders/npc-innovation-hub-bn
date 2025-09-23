import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/database'
import { UserAttributes, UserSignupAttributes } from '../types/user.type'
const currentDate = new Date()
const userPasswordValidityPeriod = new Date(currentDate)
userPasswordValidityPeriod.setMonth(currentDate.getMonth() + 3)

class User
  extends Model<UserAttributes, UserSignupAttributes>
  implements UserAttributes
{
  declare id: string
  declare firstName: string
  declare lastName: string
  declare email: string
  declare password: string
  declare phone: string
  declare image: string
  declare gender: string
  declare verified: boolean
  declare role: 'Admin' | 'Member' // Modified to only allow these two values
  declare isActive: boolean
  declare createdAt: Date
  declare updatedAt: Date
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      onDelete: 'CASCADE',
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    role: {
      type: DataTypes.ENUM('Admin', 'Member'),
      allowNull: false,
      defaultValue: 'Member', 
      validate: {
        isIn: [['Admin', 'Member']], 
      },
    },
    isActive: {
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
    sequelize: sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
  }
)

export default User