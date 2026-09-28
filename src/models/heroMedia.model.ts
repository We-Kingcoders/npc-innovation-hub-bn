import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

// Admin-controlled homepage hero background media (images and/or videos) -
// replaces the previously hardcoded /assets/images/hubimage.jpg. Unlike
// HubIntroVideo (a deliberate singleton powering a different, unrelated
// landing-page section) this table holds many ordered rows on purpose.
interface HeroMediaAttributes {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  cloudinaryPublicId: string;
  thumbnailUrl: string | null;
  title: string | null;
  altText: string | null;
  caption: string | null;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type HeroMediaCreationAttributes = Optional<
  HeroMediaAttributes,
  'id' | 'thumbnailUrl' | 'title' | 'altText' | 'caption' | 'isActive' | 'isDefault' | 'createdAt' | 'updatedAt'
>;

class HeroMedia
  extends Model<HeroMediaAttributes, HeroMediaCreationAttributes>
  implements HeroMediaAttributes
{
  declare id: string;
  declare type: 'IMAGE' | 'VIDEO';
  declare url: string;
  declare cloudinaryPublicId: string;
  declare thumbnailUrl: string | null;
  declare title: string | null;
  declare altText: string | null;
  declare caption: string | null;
  declare isActive: boolean;
  declare isDefault: boolean;
  declare displayOrder: number;
  declare uploadedBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

HeroMedia.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    type: {
      type: DataTypes.ENUM('IMAGE', 'VIDEO'),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cloudinaryPublicId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    altText: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    uploadedBy: {
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
    modelName: 'HeroMedia',
    tableName: 'hero_media',
    timestamps: true,
  }
);

HeroMedia.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

export default HeroMedia;
