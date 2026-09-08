import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isTestEnv = process.env.NODE_ENV === 'test';

// In test mode this must NEVER resolve to the same database the app/dev/
// production connects to - tests (see __tests__/setup.ts) call
// sequelize.sync({ force: true }), which drops and recreates every table.
// This exact mistake happened once already: a developer ran `npm test`
// locally with a real .env present (pointing at the actual Neon production
// database) and it was only luck (setup.ts wasn't wired into Jest at the
// time) that nothing was dropped. CI's own workflow already provisions a
// disposable local Postgres specifically for this - DB_USER there, note,
// not DB_USERNAME - so test mode reads that instead of the app's real vars,
// with safe localhost defaults for running tests locally against
// `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`.
const dbHost = isTestEnv ? (process.env.DB_HOST || 'localhost') : process.env.DB_HOST;
const dbName = isTestEnv ? (process.env.DB_NAME || 'test_db') : (process.env.DB_NAME as string);
const dbUser = isTestEnv
  ? (process.env.DB_USER || process.env.DB_USERNAME || 'postgres')
  : (process.env.DB_USERNAME as string);
const dbPassword = isTestEnv ? (process.env.DB_PASSWORD || 'postgres') : (process.env.DB_PASSWORD as string);

if (isTestEnv) {
  const safeHosts = ['localhost', '127.0.0.1', '::1'];
  if (!dbHost || !safeHosts.includes(dbHost)) {
    throw new Error(
      `Refusing to run tests against DB_HOST="${String(dbHost)}" - this isn't a local test database. ` +
      'Tests call sequelize.sync({ force: true }), which drops and recreates every table. ' +
      'Set DB_HOST=localhost (matching a local/CI Postgres instance) before running tests.'
    );
  }
}

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  {
    host: dbHost,
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    // Neon needs SSL; a local test/CI Postgres doesn't have it configured.
    dialectOptions: isTestEnv ? {} : {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    schema: 'public',
    logging: false
  }
);

export default sequelize;