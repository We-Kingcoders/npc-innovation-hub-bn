import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

// Deliberately a singleton table - the application layer (controller) always
// enforces at most one row here, never the database. See
// admin/hubVideo.controller.ts: upload always finds-or-creates the one row.
interface HubIntroVideoAttributes {
  id: string;
  videoUrl: string;
  cloudinaryPublicId: string;
  title: string | null;
  description: string | null;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type HubIntroVideoCreationAttributes = Optional<
  HubIntroVideoAttributes,
  'id' | 'title' | 'description' | 'createdAt' | 'updatedAt'
>;

class HubIntroVideo
  extends Model<HubIntroVideoAttributes, HubIntroVideoCreationAttributes>
  implements HubIntroVideoAttributes
{
  declare id: string;
  declare videoUrl: string;
  declare cloudinaryPublicId: string;
  declare title: string | null;
  declare description: string | null;
  declare uploadedBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

HubIntroVideo.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cloudinaryPublicId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    modelName: 'HubIntroVideo',
    tableName: 'hub_intro_videos',
    timestamps: true,
  }
);

HubIntroVideo.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

export default HubIntroVideo;
