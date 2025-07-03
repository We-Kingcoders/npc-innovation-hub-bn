/**
 * Resource Model Definition
 * Learning resources with video upload support and fixed TypeScript errors
 * 
 * @created_by Alain275
 * @created_at 2025-07-03 19:51:48 UTC
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

// Resource categories enum
export enum ResourceCategory {
  BACKEND = 'Backend',
  FRONTEND = 'Frontend',
  CYBERSECURITY = 'Cybersecurity'
}

// Resource types enum
export enum ResourceType {
  VIDEO = 'Video',
  DOCUMENTATION = 'Documentation',
  BOOK = 'Book',
  OTHER = 'Other'
}

// Resource difficulty levels enum
export enum ResourceDifficulty {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced'
}

// Define resource attributes
interface ResourceAttributes {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: ResourceCategory;
  type: ResourceType;
  difficulty: ResourceDifficulty;
  url: string | null;
  imageUrl: string;
  videoUrl: string | null;
  author: string;
  isPaid: boolean;
  price: number;
  purchaseDate: Date;
  platform: string;
  tags: string[]; // Array of tags
  isFeatured: boolean;
  isHosted: boolean; // Flag to indicate if video is hosted locally
  duration: number;
  upvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

// Define attributes for resource creation
type ResourceCreationAttributes = Optional<ResourceAttributes, 
  'id' | 'upvotes' | 'isFeatured' | 'imageUrl' | 'videoUrl' | 'tags' | 
  'price' | 'purchaseDate' | 'platform' | 'isHosted' | 'duration'>;

class Resource extends Model<ResourceAttributes, ResourceCreationAttributes> implements ResourceAttributes {
  declare id: string;
  declare userId: string;
  declare title: string;
  declare description: string;
  declare category: ResourceCategory;
  declare type: ResourceType;
  declare difficulty: ResourceDifficulty;
  declare url: string | null;
  declare imageUrl: string;
  declare videoUrl: string | null;
  declare author: string;
  declare isPaid: boolean;
  declare price: number;
  declare purchaseDate: Date;
  declare platform: string;
  declare tags: string[];
  declare isFeatured: boolean;
  declare isHosted: boolean;
  declare duration: number;
  declare upvotes: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Resource.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(...Object.values(ResourceCategory)),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ResourceType)),
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM(...Object.values(ResourceDifficulty)),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true, // Allow null for hosted videos
      validate: {
        isUrlOrNull(value: string | null) {
          if (value !== null && value !== undefined && value !== '') {
            // Use Sequelize's built-in validator
            if (!/^https?:\/\/.+/i.test(value)) {
              throw new Error('URL format is invalid');
            }
          }
        }
      }
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg?auto=compress&cs=tinysrgb&w=600',
      validate: {
        isUrlOrNull(value: string | null) {
          if (value !== null && value !== undefined && value !== '') {
            if (!/^https?:\/\/.+/i.test(value)) {
              throw new Error('Image URL format is invalid');
            }
          }
        }
      }
    },
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrlOrNull(value: string | null) {
          if (value !== null && value !== undefined && value !== '') {
            if (!/^https?:\/\/.+/i.test(value)) {
              throw new Error('Video URL format is invalid');
            }
          }
        }
      }
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // Assuming most resources are paid
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isHosted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Duration in seconds for videos, estimated reading time for other resources',
    },
    upvotes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Resource',
    tableName: 'resources',
    timestamps: true,
  }
);

// Define associations
Resource.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Resource, { foreignKey: 'userId' });

// Create a separate model for resource upvotes to track who upvoted what
class ResourceUpvote extends Model {
  declare id: string;
  declare resourceId: string;
  declare userId: string;
  declare createdAt: Date;
}

// Set imageUrl based on resource type before validation if not provided
Resource.beforeValidate((resource: Resource) => {
  if (!resource.imageUrl) {
    switch(resource.type) {
      case ResourceType.VIDEO:
        resource.imageUrl = 'https://images.pexels.com/photos/2228561/pexels-photo-2228561.jpeg?auto=compress&cs=tinysrgb&w=600';
        break;
      case ResourceType.DOCUMENTATION:
        resource.imageUrl = 'https://images.pexels.com/photos/3771074/pexels-photo-3771074.jpeg?auto=compress&cs=tinysrgb&w=600';
        break;
      case ResourceType.BOOK:
        resource.imageUrl = 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=600';
        break;
      default:
        resource.imageUrl = 'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg?auto=compress&cs=tinysrgb&w=600';
    }
  }
});
ResourceUpvote.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'resources',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ResourceUpvote',
    tableName: 'resource_upvotes',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['resourceId', 'userId'],
      },
    ],
  }
);

// Define associations for upvotes
ResourceUpvote.belongsTo(Resource, { foreignKey: 'resourceId' });
Resource.hasMany(ResourceUpvote, { foreignKey: 'resourceId' });

ResourceUpvote.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(ResourceUpvote, { foreignKey: 'userId' });

// Create a model for saving/bookmarking resources
class SavedResource extends Model {
  declare id: string;
  declare resourceId: string;
  declare userId: string;
  declare createdAt: Date;
}

SavedResource.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'resources',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'SavedResource',
    tableName: 'saved_resources',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['resourceId', 'userId'],
      },
    ],
  }
);

// Define associations for saved resources
SavedResource.belongsTo(Resource, { foreignKey: 'resourceId' });
Resource.hasMany(SavedResource, { foreignKey: 'resourceId' });

SavedResource.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(SavedResource, { foreignKey: 'userId' });

export { Resource, ResourceUpvote, SavedResource };
export default Resource;