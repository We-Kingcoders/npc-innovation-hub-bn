// Regression coverage for three related password-reset vulnerabilities,
// all in the same requestPasswordReset/resetPassword pair:
//
// 1. The reset token used to be returned directly in the
//    request-password-reset API response, not just emailed - anyone who
//    submitted any victim's email got a working token back immediately.
// 2. requestPasswordReset called generateToken() (a plain 7-day access
//    token, no tokenType) instead of generateResetToken() (30 minutes,
//    tokenType: "reset"), and resetPassword never checked tokenType at
//    all - so any valid token for a user, not just a real reset token,
//    could be replayed against password reset.
// 3. A successfully-used reset token was never invalidated, so the same
//    token/link could reset the password again and again within its
//    validity window.
//
// No model mocks here (deliberately, matching rbac.route-hardening.test.ts
// and user.signup-role.test.ts's reasoning): user.controller.ts imports
// member.model.ts and notification.model.ts, both of which call
// `belongsTo(User, ...)` at module load time - jest.mock()-ing User
// breaks that at import time, before any test runs. These requests run
// against the real disposable test database instead, with only the
// email send itself mocked out.
import request from 'supertest';
import express, { Express } from 'express';
import userRoutes from '../src/routes/user.route';
import User from '../src/models/user.model';
import { Notification } from '../src/models/notification.model';
import { hashPassword, comparePassword } from '../src/utils/password.utils';
import { generateToken } from '../src/utils/tokenGenerator.utils';
import { sendEmail } from '../src/utils/email.utils';

jest.mock('../src/utils/email.utils', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  return app;
}

function extractTokenFromLastEmail(): string {
  const calls = (sendEmail as jest.Mock).mock.calls;
  const [, , text] = calls[calls.length - 1] as [string, string, string, string];
  const match = /token=([^\s&]+)/.exec(text);
  if (!match) throw new Error('No token found in the reset email body');
  return match[1];
}

describe('Password reset security', () => {
  const email = `pw-reset-security-${Date.now()}@example.com`;
  let userId: string;

  beforeAll(async () => {
    const hashed = await hashPassword('OldPassw0rd!23');
    const user = await User.create({
      firstName: 'Reset',
      lastName: 'Target',
      email,
      password: hashed,
    } as any);
    userId = user.getDataValue('id') as string;
  });

  afterAll(async () => {
    // The successful reset creates a Notification row referencing this
    // user (userId FK) - has to go first, or the User delete below hits
    // a foreign-key constraint violation.
    await Notification.destroy({ where: { userId } });
    await User.destroy({ where: { email } });
  });

  afterEach(() => jest.clearAllMocks());

  it('does not return the reset token in the API response', async () => {
    const res = await request(buildApp())
      .post('/api/users/request-password-reset')
      .send({ email });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeUndefined();
    // A JWT always contains this exact substring (base64 of `{"alg":`) -
    // asserting the whole response body for it rules out the token
    // resurfacing under any other key too.
    expect(JSON.stringify(res.body)).not.toContain('eyJhbGciOiJ');
  });

  it('rejects a non-reset token (e.g. a normal access token) at /reset-password', async () => {
    const accessToken = await generateToken({
      id: userId,
      email,
      role: 'Member',
      firstName: 'Reset',
    } as any);

    const res = await request(buildApp())
      .post(`/api/users/reset-password?token=${accessToken}`)
      .send({ newPassword: 'NewPassw0rd!23' });

    expect(res.status).toBe(400);
  });

  it('accepts a real reset token exactly once, and rejects it on replay', async () => {
    await request(buildApp())
      .post('/api/users/request-password-reset')
      .send({ email });

    const resetToken = extractTokenFromLastEmail();

    const first = await request(buildApp())
      .post(`/api/users/reset-password?token=${resetToken}`)
      .send({ newPassword: 'NewPassw0rd!23' });
    expect(first.status).toBe(200);

    const updated = await User.findOne({ where: { email } });
    expect(
      await comparePassword(
        'NewPassw0rd!23',
        updated!.getDataValue('password') as string,
      ),
    ).toBe(true);

    const replay = await request(buildApp())
      .post(`/api/users/reset-password?token=${resetToken}`)
      .send({ newPassword: 'AnotherPassw0rd!23' });
    expect(replay.status).toBe(400);
  });
});
