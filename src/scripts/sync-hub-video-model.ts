// One-off, scoped schema sync for the HubIntroVideo model - NOT a Sequelize
// CLI migration. Run once against an environment that can reach the real
// database:
//   npm run db:sync-hub-video
// Only creates/alters the `hub_intro_videos` table; never touches other
// tables. uploadedBy has no explicit defaultValue, so this does not hit the
// same reviewedBy ALTER COLUMN bug fixed in sync-application-model.ts.
import sequelize from '../config/database';
import HubIntroVideo from '../models/hubIntroVideo.model';

async function run(): Promise<void> {
  try {
    console.log('Syncing HubIntroVideo model schema (alter: true)...');
    await HubIntroVideo.sync({ alter: true });
    console.log('hub_intro_videos table schema is now in sync with the model.');
  } catch (error) {
    console.error('Failed to sync HubIntroVideo schema:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
