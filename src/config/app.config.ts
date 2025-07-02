// config/app.config.ts
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const config = {
  app: {
    name: process.env.APP_NAME || 'express-ts-app',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
  },
  paths: {
    root: path.resolve(__dirname, '../../'),
    uploads: path.resolve(__dirname, '../../uploads'),
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRY || '24h',
  }
};

export default config;
