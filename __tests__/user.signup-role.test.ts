// Regression coverage for a real vulnerability: POST /api/users/signup is
// public and unauthenticated (only rate-limited), and used to accept
// req.body.role directly - the Joi schema even listed "Admin" as a valid
// value. Anyone could self-register as a fully privileged Admin without
// ever going through the actual account-creation path this app was built
// around (an Application reviewed and accepted by an Admin - see
// admin/application.controller.ts's acceptApplication, which hardcodes
// role: 'Member' server-side the same way this fix does).
//
// No model mocks here (deliberately, matching rbac.route-hardening.test.ts's
// reasoning): user.controller.ts imports member.model.ts and
// notification.model.ts, both of which call `belongsTo(User, ...)` at
// module load time - jest.mock()-ing User replaces it with something that
// isn't a real Sequelize.Model subclass, which throws on import before any
// test runs. These requests are left to run against the real disposable
// test database (already schema-synced by this suite's globalSetup),
// with only the email send itself mocked out.
import request from 'supertest';
import express, { Express } from 'express';
import userRoutes from '../src/routes/user.route';
import User from '../src/models/user.model';

jest.mock('../src/utils/email.utils', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  return app;
}

describe('POST /api/users/signup - role cannot be client-controlled', () => {
  const rejectedEmail = `signup-role-rejected-${Date.now()}@example.com`;
  const memberEmail = `signup-role-member-${Date.now()}@example.com`;

  afterAll(async () => {
    await User.destroy({ where: { email: [rejectedEmail, memberEmail] } });
  });

  it('rejects a signup request that attempts to set role at all', async () => {
    const res = await request(buildApp())
      .post('/api/users/signup')
      .send({
        firstName: 'Attacker',
        lastName: 'Person',
        email: rejectedEmail,
        password: 'Passw0rd!23',
        role: 'Admin',
      });

    expect(res.status).toBe(400);

    const created = await User.findOne({ where: { email: rejectedEmail } });
    expect(created).toBeNull();
  });

  it('creates the account as Member regardless, with no role in the request', async () => {
    const res = await request(buildApp())
      .post('/api/users/signup')
      .send({
        firstName: 'Real',
        lastName: 'Person',
        email: memberEmail,
        password: 'Passw0rd!23',
      });

    expect(res.status).toBe(200);

    const created = await User.findOne({ where: { email: memberEmail } });
    expect(created).not.toBeNull();
    expect(created?.getDataValue('role')).toBe('Member');
  });
});
