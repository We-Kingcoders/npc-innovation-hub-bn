// Fix a single Member row whose role doesn't match the current
// MEMBER_SPECIALIZATIONS enum (e.g. the old 'Member' fallback literal).
//
// Read-only report (default, no args):
//   npm run db:fix-stale-role
//
// Write mode (both --id and --role are required together; anything less
// falls back to a report, never a silent write):
//   npm run db:fix-stale-role -- --id=<memberId> --role="<New Role Value>"
//
// Write mode only ever updates the single row matched by --id, and only
// after an interactive "type yes to confirm" prompt showing the exact
// before/after values. There is no bulk mode and no default/fallback value
// applied automatically.
import * as readline from 'readline';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import Member from '../models/member.model';
import User from '../models/user.model';
import { MEMBER_SPECIALIZATIONS } from '../validations/member.validation';

function parseArgs(argv: string[]): { id?: string; role?: string } {
  const result: { id?: string; role?: string } = {};
  for (const arg of argv) {
    const idMatch = arg.match(/^--id=(.*)$/);
    if (idMatch) result.id = idMatch[1];
    const roleMatch = arg.match(/^--role=(.*)$/);
    if (roleMatch) result.role = roleMatch[1].replace(/^"|"$/g, '');
  }
  return result;
}

function askYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function reportStaleRoles(): Promise<void> {
  const staleMembers = await Member.findAll({
    where: { role: { [Op.notIn]: [...MEMBER_SPECIALIZATIONS] } },
    include: [{ model: User, attributes: ['email'] }],
  });

  if (staleMembers.length === 0) {
    console.log('No stale role values found - every Member row matches the current enum.');
    return;
  }

  console.log(`Found ${staleMembers.length} member row(s) with a role outside the current enum:\n`);
  for (const member of staleMembers) {
    const email = (member as unknown as { User?: { email?: string } }).User?.email ?? '(no linked user email)';
    console.log(`  id:       ${member.id}`);
    console.log(`  userId:   ${member.userId}`);
    console.log(`  name:     ${member.name}`);
    console.log(`  role:     "${member.role}"`);
    console.log(`  tagline:  ${member.tagline ?? '(none)'}`);
    console.log(`  email:    ${email}`);
    console.log('');
  }

  console.log('To fix one of these, run:');
  console.log('  npm run db:fix-stale-role -- --id=<memberId> --role="<New Role Value>"');
  console.log(`Valid role values: ${MEMBER_SPECIALIZATIONS.join(', ')}`);
}

async function writeRole(id: string, role: string): Promise<void> {
  if (!(MEMBER_SPECIALIZATIONS as readonly string[]).includes(role)) {
    console.error(`Invalid --role value: "${role}"`);
    console.error(`Valid role values: ${MEMBER_SPECIALIZATIONS.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const member = await Member.findByPk(id);
  if (!member) {
    console.error(`No Member row found with id: ${id}`);
    process.exitCode = 1;
    return;
  }

  console.log('About to update a single Member row:');
  console.log(`  id:          ${member.id}`);
  console.log(`  name:        ${member.name}`);
  console.log(`  current role: "${member.role}"`);
  console.log(`  new role:     "${role}"`);
  console.log('');

  const confirmed = await askYesNo('Type "yes" to apply this change, anything else to cancel: ');
  if (!confirmed) {
    console.log('Cancelled. No changes were made.');
    return;
  }

  await member.update({ role, updatedAt: new Date() });

  const updated = await Member.findByPk(id);
  console.log('\nUpdate applied. Row now reads:');
  console.log(`  id:   ${updated?.id}`);
  console.log(`  name: ${updated?.name}`);
  console.log(`  role: "${updated?.role}"`);
}

async function run(): Promise<void> {
  const { id, role } = parseArgs(process.argv.slice(2));

  try {
    console.log('Connecting to the database...');
    await sequelize.authenticate();
    console.log('Connected.\n');

    if (!id && !role) {
      await reportStaleRoles();
    } else if (id && role) {
      await writeRole(id, role);
    } else {
      console.error('Both --id and --role are required together to write a change.');
      console.error('Run with no arguments for a read-only report of stale rows.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Failed to check/fix stale role values:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
