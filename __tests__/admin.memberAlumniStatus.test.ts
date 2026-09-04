import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import adminMemberRoutes from '../src/routes/admin/member.routes';
import Member from '../src/models/member.model';

// Only Member is module-mocked; User (its own userId association) is left
// real, since member.model.ts calls `Member.belongsTo(User, ...)` at import
// time, which needs User to be a genuine Sequelize Model subclass, not an
// automock.
jest.mock('../src/models/member.model');

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/members', adminMemberRoutes);
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

const MEMBER_ID = 'c3333333-3333-4333-8333-333333333333';
const OLD_ALUMNI_SINCE = new Date('2024-01-01T00:00:00.000Z');

function mockMemberRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: MEMBER_ID,
    name: 'Jane Doe',
    role: 'Backend Developer',
    isAlumni: false,
    alumniSince: null,
    update: jest.fn(),
    ...overrides,
  };
  fields.update = fields.update ?? jest.fn();
  return fields;
}

afterEach(() => jest.clearAllMocks());

describe('PATCH /api/admin/members/:id/alumni-status', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).patch(`/api/admin/members/${MEMBER_ID}/alumni-status`).send({ isAlumni: true });
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/members/${MEMBER_ID}/alumni-status`)
      .set('Authorization', `Bearer ${memberToken()}`)
      .send({ isAlumni: true });
    expect(res.status).toBe(403);
  });

  it('returns 400 when isAlumni is missing from the body', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/members/${MEMBER_ID}/alumni-status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when isAlumni is not a boolean', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/members/${MEMBER_ID}/alumni-status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ isAlumni: 'yes' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when the member does not exist', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/admin/members/${MEMBER_ID}/alumni-status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ isAlumni: true });

    expect(res.status).toBe(404);
  });

  it('promotes a non-alumni member: sets isAlumni true and alumniSince to now', async () => {
    const member = mockMemberRow({ isAlumni: false, alumniSince: null });
    (Member.findByPk as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/admin/members/${MEMBER_ID}/alumni-status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ isAlumni: true });

    expect(res.status).toBe(200);
    expect((member as { update: jest.Mock }).update).toHaveBeenCalledWith(
      expect.objectContaining({ isAlumni: true, alumniSince: expect.any(Date) })
    );
  });

  it('promoting an already-promoted member is idempotent: keeps the existing alumniSince', async () => {
    const member = mockMemberRow({ isAlumni: true, alumniSince: OLD_ALUMNI_SINCE });
    (Member.findByPk as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/admin/members/${MEMBER_ID}/alumni-status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ isAlumni: true });

    expect(res.status).toBe(200);
    expect((member as { update: jest.Mock }).update).toHaveBeenCalledWith(
      expect.objectContaining({ isAlumni: true, alumniSince: OLD_ALUMNI_SINCE })
    );
  });

  it('demotes an alumni member: sets isAlumni false and clears alumniSince', async () => {
    const member = mockMemberRow({ isAlumni: true, alumniSince: OLD_ALUMNI_SINCE });
    (Member.findByPk as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/admin/members/${MEMBER_ID}/alumni-status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ isAlumni: false });

    expect(res.status).toBe(200);
    expect((member as { update: jest.Mock }).update).toHaveBeenCalledWith(
      expect.objectContaining({ isAlumni: false, alumniSince: null })
    );
  });
});
