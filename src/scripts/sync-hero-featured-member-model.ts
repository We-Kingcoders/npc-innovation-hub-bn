// One-off, scoped schema sync for the HeroFeaturedMember model - NOT a
// Sequelize CLI migration. Run once against an environment that can reach
// the real database:
//   npm run db:sync-hero-members
// Only creates/alters the `hero_featured_members` table; never touches
// other tables.
import sequelize from '../config/database';
import HeroFeaturedMember from '../models/heroFeaturedMember.model';

async function run(): Promise<void> {
  try {
    console.log('Syncing HeroFeaturedMember model schema (alter: true)...');
    await HeroFeaturedMember.sync({ alter: true });
    console.log('hero_featured_members table schema is now in sync with the model.');
  } catch (error) {
    console.error('Failed to sync HeroFeaturedMember schema:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
