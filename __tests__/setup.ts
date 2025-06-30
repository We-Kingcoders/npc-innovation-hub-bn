import { sequelize } from '../src/config/database';

// Global setup - run once before all tests
beforeAll(async () => {
  // Create tables
  await sequelize.sync({ force: true });
});

// Global teardown - run once after all tests
afterAll(async () => {
  // Close database connection
  await sequelize.close();
});