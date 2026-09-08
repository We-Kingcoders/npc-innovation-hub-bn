// Runs exactly once, in its own process, before any Jest worker starts -
// unlike setupFilesAfterEnv's beforeAll/afterAll (which runs once per test
// FILE, in whichever parallel worker picks it up). Schema creation must
// happen here: sequelize.sync({ force: true }) drops and recreates every
// table, and running that once per file across parallel workers races
// against itself (confirmed: 5 suites/32 tests failed with createTable
// errors when this lived in setup.ts's beforeAll instead).
import sequelize from '../src/config/database';

export default async function globalSetup(): Promise<void> {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  await sequelize.close();
}
