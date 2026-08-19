// Read-only check: does the real `members` table have a resumeUrl column yet?
//   npm run db:check-resume-column
// Does not alter anything - describes the live table via Sequelize's
// queryInterface and reports whether resumeUrl is present.
import sequelize from '../config/database';

async function run(): Promise<void> {
  try {
    console.log('Connecting to the database...');
    await sequelize.authenticate();
    console.log('Connected. Describing the members table...');

    const columns = await sequelize.getQueryInterface().describeTable('members');

    if ('resumeUrl' in columns) {
      const column = columns.resumeUrl;
      console.log('resumeUrl column FOUND on the members table:');
      console.log(`  type: ${column.type}`);
      console.log(`  allowNull: ${column.allowNull}`);
    } else {
      console.log('resumeUrl column NOT FOUND on the members table.');
      console.log('Run `npm run db:sync-member` to add it.');
    }
  } catch (error) {
    console.error('Failed to check the resumeUrl column:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
