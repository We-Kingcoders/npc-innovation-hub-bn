// One-off, scoped schema sync for the Application model - NOT a Sequelize
// CLI migration. Run once against an environment that can reach the real
// database:
//   npm run db:sync-application
// Only creates/alters the `applications` table; never touches other tables.
import sequelize from '../config/database';
import Application from '../models/application.model';

async function run(): Promise<void> {
  try {
    console.log('Syncing Application model schema (alter: true)...');
    await Application.sync({ alter: true });
    console.log('applications table schema is now in sync with the model.');
  } catch (error) {
    console.error('Failed to sync Application schema:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
