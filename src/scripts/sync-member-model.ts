// One-off, scoped schema sync for the Member model - NOT a Sequelize CLI migration.
// Run once against an environment that can reach the real database:
//   npm run db:sync-member
// Only alters the `members` table (adds languages/cvUrl/tagline/availability
// columns); it never touches other tables.
import sequelize from '../config/database';
import Member from '../models/member.model';

async function run(): Promise<void> {
  try {
    console.log('Syncing Member model schema (alter: true)...');
    await Member.sync({ alter: true });
    console.log('Member table schema is now in sync with the model.');
  } catch (error) {
    console.error('Failed to sync Member schema:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
