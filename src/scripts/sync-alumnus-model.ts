// One-off, scoped schema sync for the Alumnus model - NOT a Sequelize CLI
// migration. Run once against an environment that can reach the real
// database:
//   npm run db:sync-alumnus
// Only creates/alters the `alumni` table; never touches other tables.
// createdBy has no explicit defaultValue, so this does not risk the
// reviewedBy-style ALTER COLUMN bug fixed in sync-application-model.ts.
import sequelize from '../config/database';
import Alumnus from '../models/alumnus.model';

async function run(): Promise<void> {
  try {
    console.log('Syncing Alumnus model schema (alter: true)...');
    await Alumnus.sync({ alter: true });
    console.log('alumni table schema is now in sync with the model.');
  } catch (error) {
    console.error('Failed to sync Alumnus schema:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
