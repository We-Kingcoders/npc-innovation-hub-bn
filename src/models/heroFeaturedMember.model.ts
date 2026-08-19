import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Member from './member.model';

// Deliberately no name/image/role columns here - those always come live from
// the associated Member record via the include below, never duplicated or
// snapshotted, so an admin-curated hero slide reflects the member's current
// profile automatically.
interface HeroFeaturedMemberAttributes {
  id: string;
  memberId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

type HeroFeaturedMemberCreationAttributes = Optional<
  HeroFeaturedMemberAttributes,
  'id' | 'order' | 'createdAt' | 'updatedAt'
>;

class HeroFeaturedMember
  extends Model<HeroFeaturedMemberAttributes, HeroFeaturedMemberCreationAttributes>
  implements HeroFeaturedMemberAttributes
{
  declare id: string;
  declare memberId: string;
  declare order: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

HeroFeaturedMember.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    memberId: {
      type: DataTypes.UUID,
      allowNull: false,
      // A member can only be featured once - reject duplicate adds.
      unique: true,
    },
    order: {
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
    sequelize,
    modelName: 'HeroFeaturedMember',
    tableName: 'hero_featured_members',
    timestamps: true,
  }
);

HeroFeaturedMember.belongsTo(Member, { foreignKey: 'memberId' });
Member.hasOne(HeroFeaturedMember, { foreignKey: 'memberId' });

export default HeroFeaturedMember;
