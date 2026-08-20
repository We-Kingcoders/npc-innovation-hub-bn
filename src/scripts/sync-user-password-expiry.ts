// One-off, scoped schema sync for the User model - NOT a Sequelize CLI
// migration. Run once against an environment that can reach the real
// database:
//   npm run db:sync-user-password-expiry
// Only alters the `users` table (adds isTemporaryPassword/passwordExpiresAt
// columns); it never touches other tables.
import sequelize from '../config/database';
import User from '../models/user.model';

async function run(): Promise<void> {
  try {
    console.log('Syncing User model schema (alter: true)...');
    await User.sync({ alter: true });
    console.log('users table schema is now in sync with the model.');
  } catch (error) {
    console.error('Failed to sync User schema:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
