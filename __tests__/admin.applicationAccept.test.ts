import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import adminApplicationRoutes from '../src/routes/admin/application.routes';
import Application from '../src/models/application.model';
import User from '../src/models/user.model';
import Member from '../src/models/member.model';
import sequelize from '../src/config/database';
import { sendTemplateEmail, EmailTemplate } from '../src/utils/email.utils';
import { generateSecurePassword, hashPassword } from '../src/utils/password.utils';

// Only Application is module-mocked, because Application.belongsTo(User, ...)
// needs User to stay a real Sequelize Model subclass. User and Member are
// left real and controlled via jest.spyOn on their static create() methods,
// for the same reason - Member.belongsTo(User, ...) / User.hasOne(Member, ...)
// need both classes to be genuine. sequelize.transaction is spied directly on
// the real singleton so the controller's managed-transaction callback runs
// for real (proving ordering/rollback), without needing a live database.
jest.mock('../src/models/application.model');
jest.mock('../src/utils/email.utils');
jest.mock('../src/utils/password.utils');

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/applications', adminApplicationRoutes);
  return app;
}

function adminToken(): string {
  return jwt.sign({ id: 'a1111111-1111-4111-8111-111111111111', role: 'Admin' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

function memberToken(): string {
  return jwt.sign({ id: 'b2222222-2222-4222-8222-222222222222', role: 'Member' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

const APPLICATION_ID = 'c3333333-3333-4333-8333-333333333333';
const NEW_USER_ID = 'd4444444-4444-4444-8444-444444444444';
const NEW_MEMBER_ID = 'e5555555-5555-4555-8555-555555555555';
const TEMP_PASSWORD = 'Xy9#aBcD2fGh';
const HASHED_PASSWORD = '$2b$12$fakehashfakehashfakehashfake';

function mockApplicationRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: APPLICATION_ID,
    imageUrl: null,
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    githubUrl: 'https://github.com/janedoe',
    skills: ['Node.js', 'React'],
    phoneNumber: '+250788000000',
    gender: 'Female',
    strengths: 'Fast learner',
    weaknesses: 'Public speaking',
    applicationLetterUrl: 'https://cloudinary.example.com/letters/jane.pdf',
    status: 'Pending',
    reviewedBy: null,
    reviewedAt: null,
    update: jest.fn(),
    ...overrides,
  };
  fields.update = fields.update ?? jest.fn();
  return fields;
}

beforeEach(() => {
  (generateSecurePassword as jest.Mock).mockReturnValue(TEMP_PASSWORD);
  (hashPassword as jest.Mock).mockResolvedValue(HASHED_PASSWORD);
  jest.spyOn(sequelize, 'transaction').mockImplementation(((fn: (t: unknown) => Promise<unknown>) =>
    fn({})) as never);
});

afterEach(() => jest.restoreAllMocks());

describe('PATCH /api/admin/applications/:id/accept', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).patch(`/api/admin/applications/${APPLICATION_ID}/accept`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/applications/${APPLICATION_ID}/accept`)
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when the application does not exist', async () => {
    (Application.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/admin/applications/${APPLICATION_ID}/accept`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 409 when the application has already been decided', async () => {
    (Application.findByPk as jest.Mock).mockResolvedValue(mockApplicationRow({ status: 'Accepted' }));

    const res = await request(buildApp())
      .patch(`/api/admin/applications/${APPLICATION_ID}/accept`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(409);
    expect(sendTemplateEmail).not.toHaveBeenCalled();
  });

  it('creates a User and Member, sends the acceptance email, and marks the application Accepted', async () => {
    const row = mockApplicationRow();
    (Application.findByPk as jest.Mock).mockResolvedValue(row);
    jest.spyOn(User, 'create').mockResolvedValue({ id: NEW_USER_ID, email: 'jane@example.com' } as never);
    jest.spyOn(Member, 'create').mockResolvedValue({ id: NEW_MEMBER_ID } as never);
    (sendTemplateEmail as jest.Mock).mockResolvedValue(undefined);

    const res = await request(buildApp())
      .patch(`/api/admin/applications/${APPLICATION_ID}/accept`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@example.com',
        password: HASHED_PASSWORD,
        role: 'Member',
        verified: true,
        isTemporaryPassword: true,
        passwordExpiresAt: expect.any(Date),
      }),
      expect.objectContaining({ transaction: expect.anything() })
    );
    expect(Member.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: NEW_USER_ID, name: 'Jane Doe', skills: ['Node.js', 'React'] }),
      expect.objectContaining({ transaction: expect.anything() })
    );
    expect(sendTemplateEmail).toHaveBeenCalledWith(
      'jane@example.com',
      EmailTemplate.APPLICATION_ACCEPTED,
      expect.objectContaining({ tempPassword: TEMP_PASSWORD })
    );
    expect((row as { update: jest.Mock }).update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Accepted',
        reviewedBy: 'a1111111-1111-4111-8111-111111111111',
      }),
      expect.objectContaining({ transaction: expect.anything() })
    );

    // The plaintext temp password must never leak into the HTTP response.
    expect(JSON.stringify(res.body)).not.toContain(TEMP_PASSWORD);
  });

  it('rolls back - does not mark the application Accepted - when the acceptance email fails to send', async () => {
    const row = mockApplicationRow();
    (Application.findByPk as jest.Mock).mockResolvedValue(row);
    jest.spyOn(User, 'create').mockResolvedValue({ id: NEW_USER_ID, email: 'jane@example.com' } as never);
    jest.spyOn(Member, 'create').mockResolvedValue({ id: NEW_MEMBER_ID } as never);
    (sendTemplateEmail as jest.Mock).mockRejectedValue(new Error('SMTP down'));

    const res = await request(buildApp())
      .patch(`/api/admin/applications/${APPLICATION_ID}/accept`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(500);
    expect((row as { update: jest.Mock }).update).not.toHaveBeenCalled();
  });
});
