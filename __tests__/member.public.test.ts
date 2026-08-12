import request from 'supertest';
import express, { Express } from 'express';
import memberRoutes from '../src/routes/member.route';
import Member from '../src/models/member.model';
import User from '../src/models/user.model';

// Only Member is module-mocked. User is left as the real Sequelize Model
// subclass (its static methods are stubbed per-test with jest.spyOn) because
// member.model.ts calls `Member.belongsTo(User, ...)` at import time, which
// requires User to be an actual Model subclass, not an automock.
jest.mock('../src/models/member.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

const MEMBER_ID = 'a1111111-1111-4111-8111-111111111111';
const USER_ID = 'b2222222-2222-4222-8222-222222222222';

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/members', memberRoutes);
  return app;
}

function baseMemberFields() {
  return {
    id: MEMBER_ID,
    userId: USER_ID,
    name: 'Jane Doe',
    role: 'Backend Developer',
    imageUrl: 'https://example.com/jane.jpg',
    bio: 'Loves distributed systems.',
    education: {
      degree: 'BSc Computer Science',
      institution: 'KIST',
      description: 'Focused on distributed systems.',
      imageUrl: 'https://example.com/edu.jpg',
    },
    contacts: { linkedin: 'https://linkedin.com/in/janedoe', github: 'https://github.com/janedoe' },
    skillDetails: [{ name: 'Backend', technologies: ['Node.js', 'Postgres'], percent: 80 }],
    skills: ['Node.js', 'Postgres'],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };
}

// Simulates real Sequelize behavior: the joined User row (with email) is only
// present on the returned instance when the caller actually requests the include.
function mockMemberRow(includeUser: boolean) {
  const fields: Record<string, unknown> = baseMemberFields();
  if (includeUser) {
    fields.User = { email: 'jane.doe@example.com' };
  }
  return { ...fields, toJSON: () => fields };
}

describe('GET /api/members (public list)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns 200 without an Authorization header', async () => {
    jest.spyOn(User, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] } as never);

    const res = await request(buildApp()).get('/api/members');

    expect(res.status).toBe(200);
  });

  it('never includes email, phone, or whatsapp in the payload', async () => {
    jest.spyOn(User, 'findAndCountAll').mockResolvedValue({
      count: 1,
      rows: [{ id: USER_ID, firstName: 'Jane', lastName: 'Doe' }],
    } as never);
    (Member.findOne as jest.Mock).mockResolvedValue(mockMemberRow(false));

    const res = await request(buildApp()).get('/api/members');

    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('email');
    expect(body).not.toContain('phone');
    expect(body).not.toContain('whatsapp');
  });

  it('rejects a non-numeric page query with 400', async () => {
    jest.spyOn(User, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] } as never);

    const res = await request(buildApp()).get('/api/members?page=abc');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/members/member/:id (public detail)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not leak the owner email even when the model association is joined', async () => {
    (Member.findByPk as jest.Mock).mockImplementation((id: string, options?: { include?: unknown }) => {
      if (id !== MEMBER_ID) return Promise.resolve(null);
      return Promise.resolve(mockMemberRow(Boolean(options?.include)));
    });

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('email');
    expect(body).not.toContain('phone');
    expect(body).not.toContain('whatsapp');
  });

  it('still returns the safe profile fields (bio, education, skills, contacts)', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(mockMemberRow(false));

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member).toMatchObject({
      name: 'Jane Doe',
      bio: 'Loves distributed systems.',
      skills: ['Node.js', 'Postgres'],
    });
    expect(res.body.data.member.education).toBeDefined();
    expect(res.body.data.member.contacts).toBeDefined();
  });

  it('returns 404 for a non-existent member id', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(404);
  });

  it('rejects a non-uuid id with 400', async () => {
    const res = await request(buildApp()).get('/api/members/member/not-a-uuid');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/members/:userId (public lookup by userId)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not leak email, phone, or whatsapp', async () => {
    (Member.findOne as jest.Mock).mockResolvedValue(mockMemberRow(false));

    const res = await request(buildApp()).get(`/api/members/${USER_ID}`);

    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('email');
    expect(body).not.toContain('phone');
    expect(body).not.toContain('whatsapp');
  });

  it('rejects a non-uuid userId with 400', async () => {
    const res = await request(buildApp()).get('/api/members/not-a-uuid');
    expect(res.status).toBe(400);
  });
});
