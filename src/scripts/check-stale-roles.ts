// Read-only check: which Member.role values don't match the current
// specialization enum (e.g. leftover 'Member' from the old default fallback)?
//   npm run db:check-stale-roles
// Does not alter or delete any rows - only counts and reports. Reuses
// MEMBER_SPECIALIZATIONS from the validation layer so this can never drift
// out of sync with what's actually enforced on writes.
import { Op } from 'sequelize';
import sequelize from '../config/database';
import Member from '../models/member.model';
import { MEMBER_SPECIALIZATIONS } from '../validations/member.validation';

interface StaleRoleRow {
  role: string;
  count: string;
}

async function run(): Promise<void> {
  try {
    console.log('Connecting to the database...');
    await sequelize.authenticate();
    console.log('Connected. Querying Member.role values outside the current enum...');

    const rows = (await Member.findAll({
      attributes: ['role', [sequelize.fn('COUNT', sequelize.col('role')), 'count']],
      where: {
        role: { [Op.notIn]: [...MEMBER_SPECIALIZATIONS] },
      },
      group: ['role'],
      order: [[sequelize.literal('count'), 'DESC']],
      raw: true,
    })) as unknown as StaleRoleRow[];

    if (rows.length === 0) {
      console.log('No stale role values found - every Member row matches the current enum.');
    } else {
      console.log('Stale role values found (value: row count), sorted by count descending:');
      for (const row of rows) {
        console.log(`  "${row.role}": ${row.count}`);
      }
    }
  } catch (error) {
    console.error('Failed to check for stale role values:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
