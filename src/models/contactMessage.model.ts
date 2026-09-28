import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Public "Contact Us" form submissions (npc-innovation-hub's
// ContactSection.tsx) - previously just a mailto: form with no backend at
// all, so there was nothing to store or confirm. Structurally close to
// HireUsInquiry (public submit -> stored -> admin reviews/replies) but
// deliberately its own table: a contact message has no company/job-title/
// country/consent fields, and conflating the two would mean either
// bolting hire-specific columns onto general contact messages or making
// them nullable and hoping nothing relies on that distinction later.
interface ContactMessageAttributes {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'Pending' | 'Reviewed' | 'Closed';
  createdAt: Date;
  updatedAt: Date;
}

type ContactMessageCreationAttributes = Optional<
  ContactMessageAttributes,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

class ContactMessage
  extends Model<ContactMessageAttributes, ContactMessageCreationAttributes>
  implements ContactMessageAttributes
{
  declare id: string;
  declare name: string;
  declare email: string;
  declare message: string;
  declare status: 'Pending' | 'Reviewed' | 'Closed';
  declare createdAt: Date;
  declare updatedAt: Date;
}

ContactMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Reviewed', 'Closed'),
      allowNull: false,
      defaultValue: 'Pending',
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
    modelName: 'ContactMessage',
    tableName: 'contact_messages',
    timestamps: true,
  }
);

export default ContactMessage;
