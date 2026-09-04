import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

// Independent of Member - deliberately no foreign key to it. A standalone
// Alumnus may have no platform account at all (e.g. an older graduate who
// predates the platform); this is a display-only record.
interface AlumnusAttributes {
  id: string;
  imageUrl: string | null;
  cloudinaryPublicId: string | null;
  fullName: string;
  role: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type AlumnusCreationAttributes = Optional<
  AlumnusAttributes,
  'id' | 'imageUrl' | 'cloudinaryPublicId' | 'createdAt' | 'updatedAt'
>;

class Alumnus
  extends Model<AlumnusAttributes, AlumnusCreationAttributes>
  implements AlumnusAttributes
{
  declare id: string;
  declare imageUrl: string | null;
  declare cloudinaryPublicId: string | null;
  declare fullName: string;
  declare role: string;
  declare createdBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Alumnus.init(
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
    },
    cloudinaryPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
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
    modelName: 'Alumnus',
    tableName: 'alumni',
    timestamps: true,
  }
);

Alumnus.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

export default Alumnus;
