import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

let sequelize: Sequelize;

if (process.env.DB_URL) {
  // ✅ Use full DB URL (commonly used in production or cloud)
  sequelize = new Sequelize(process.env.DB_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Change to true if using trusted certificates
      },
    },
    logging: false,
  });
} else {
  // ✅ Fallback to individual env vars (commonly used in local/dev environments)
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_NAME = 'express_ts_app',
    DB_USER = 'postgres',
    DB_PASSWORD = 'postgres',
    NODE_ENV = 'development',
  } = process.env;

  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    dialect: 'postgres',
    logging: NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}

// ✅ Optional: Connection test function
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

export default sequelize;
