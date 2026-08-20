// One-off, scoped schema sync for the Application model - NOT a Sequelize
// CLI migration. Run once against an environment that can reach the real
// database:
//   npm run db:sync-application
// Only creates/alters the `applications` table; never touches other tables.
//
// The `reviewedBy` column is a nullable foreign key to `users`. Sequelize's
// sync({ alter: true }) has a real bug when re-syncing an EXISTING table
// with this column present: it generates one invalid combined statement -
//   ALTER TABLE ... ALTER COLUMN "reviewedBy" SET DEFAULT NULL REFERENCES ...
// - which Postgres rejects outright ("syntax error at or near REFERENCES"),
// because ALTER COLUMN ... SET DEFAULT cannot carry a REFERENCES clause.
// This is confirmed to NOT happen on first-time table creation (CREATE
// TABLE correctly inlines the REFERENCES clause per-column); it only fires
// once the table/column already exist and sync tries to "re-alter" them.
//
// Fix: let sync({ alter: true }) do its normal job for every column. If it
// hits this specific known bug, swallow just that failure and fall back to
// explicit, separate queryInterface calls for reviewedBy - one statement to
// ensure the column shape, one addConstraint call for the foreign key -
// never combining a default-value change with a REFERENCES clause. Both
// fallback steps check current state first, so the script is safe to run
// repeatedly (idempotent) whether or not the bug actually fires this time.
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import Application from '../models/application.model';

const APPLICATIONS_TABLE = 'applications';
const REVIEWED_BY_COLUMN = 'reviewedBy';
const REVIEWED_BY_FK_CONSTRAINT = 'applications_reviewedBy_fkey';

function isKnownReviewedByAlterBug(error: unknown): boolean {
  const sql =
    (error as { sql?: string })?.sql ?? (error as { parent?: { sql?: string } })?.parent?.sql ?? '';
  return sql.includes(REVIEWED_BY_COLUMN) && sql.includes('REFERENCES') && sql.includes('SET DEFAULT');
}

async function ensureReviewedByColumn(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable(APPLICATIONS_TABLE);
  const columnDefinition = { type: DataTypes.UUID, allowNull: true, defaultValue: null };

  if (!table[REVIEWED_BY_COLUMN]) {
    console.log('reviewedBy column is missing - adding it...');
    await queryInterface.addColumn(APPLICATIONS_TABLE, REVIEWED_BY_COLUMN, columnDefinition);
    return;
  }

  if (table[REVIEWED_BY_COLUMN].type !== 'UUID') {
    console.log('reviewedBy column has the wrong type - fixing it...');
    await queryInterface.changeColumn(APPLICATIONS_TABLE, REVIEWED_BY_COLUMN, columnDefinition);
  }
}

async function ensureReviewedByForeignKey(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const existingForeignKeys = (await queryInterface.getForeignKeyReferencesForTable(APPLICATIONS_TABLE)) as Array<{
    columnName: string;
  }>;

  if (existingForeignKeys.some((fk) => fk.columnName === REVIEWED_BY_COLUMN)) {
    console.log('reviewedBy foreign key already exists - skipping.');
    return;
  }

  console.log('Adding reviewedBy foreign key constraint...');
  try {
    await queryInterface.addConstraint(APPLICATIONS_TABLE, {
      fields: [REVIEWED_BY_COLUMN],
      type: 'foreign key',
      name: REVIEWED_BY_FK_CONSTRAINT,
      references: { table: 'users', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('already exists')) {
      throw error;
    }
    console.log('reviewedBy foreign key already exists (added concurrently) - skipping.');
  }
}

async function run(): Promise<void> {
  try {
    console.log('Syncing Application model schema (alter: true)...');
    try {
      await Application.sync({ alter: true });
    } catch (error) {
      if (!isKnownReviewedByAlterBug(error)) {
        throw error;
      }
      console.warn(
        'sync({ alter: true }) hit the known Sequelize bug that combines a default-value change ' +
          'and a REFERENCES clause into one invalid ALTER COLUMN statement for reviewedBy. ' +
          'Falling back to explicit, separate statements for that column.'
      );
    }

    await ensureReviewedByColumn();
    await ensureReviewedByForeignKey();

    console.log('applications table schema is now in sync with the model.');
  } catch (error) {
    console.error('Failed to sync Application schema:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
