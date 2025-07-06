import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { v4 as uuidv4 } from 'uuid';

interface HireUsInquiryAttributes {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  job_title: string;
  country: string;
  message: string;
  consent: boolean;
  status: 'Pending' | 'Contacted' | 'Closed';
  created_at?: Date;
  updated_at?: Date;
}

class HireUsInquiry extends Model<HireUsInquiryAttributes> implements HireUsInquiryAttributes {
  public id!: string;
  public email!: string;
  public first_name!: string;
  public last_name!: string;
  public company_name!: string;
  public job_title!: string;
  public country!: string;
  public message!: string;
  public consent!: boolean;
  public status!: 'Pending' | 'Contacted' | 'Closed';
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

HireUsInquiry.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    job_title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    consent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Contacted', 'Closed'),
      defaultValue: 'Pending',
    },
  },
  {
    sequelize,
    modelName: 'HireUsInquiry',
    tableName: 'hire_us_inquiries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// Add hook to prevent empty UUID strings
HireUsInquiry.beforeCreate((instance: any) => {
  // If id is empty string, set it to proper UUID
  if (!instance.id || instance.id === '') {
    instance.id = uuidv4();
  }
});

export default HireUsInquiry;