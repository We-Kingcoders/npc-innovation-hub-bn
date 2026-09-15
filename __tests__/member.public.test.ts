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
function mockMemberRow(includeUser: boolean, overrides: Record<string, unknown> = {}) {
  const fields: Record<string, unknown> = { ...baseMemberFields(), ...overrides };
  if (includeUser) {
    fields.User = { email: 'jane.doe@example.com' };
  }
  return { ...fields, toJSON: () => fields };
}

describe('GET /api/members (public list)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns 200 without an Authorization header', async () => {
    jest.spyOn(User, 'findAll').mockResolvedValue([] as never);
    // getAllMembers batches every Member row for the page in one
    // Member.findAll() call (see member.controller.ts), even when the page
    // of users is empty.
    (Member.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/members');

    expect(res.status).toBe(200);
  });

  it('never includes email, phone, or whatsapp in the payload', async () => {
    jest
      .spyOn(User, 'findAll')
      .mockResolvedValue([{ id: USER_ID, firstName: 'Jane', lastName: 'Doe', role: 'Member' }] as never);
    (Member.findAll as jest.Mock).mockResolvedValue([mockMemberRow(false)]);

    const res = await request(buildApp()).get('/api/members');

    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('email');
    expect(body).not.toContain('phone');
    expect(body).not.toContain('whatsapp');
  });

  it('rejects a non-numeric page query with 400', async () => {
    jest.spyOn(User, 'findAll').mockResolvedValue([] as never);
    (Member.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/members?page=abc');

    expect(res.status).toBe(400);
  });

  it('queries both Member and Admin roles, not Member alone', async () => {
    // A real contributor with a completed Member profile shouldn't vanish
    // from this page purely because their site role is Admin.
    const findAllSpy = jest.spyOn(User, 'findAll').mockResolvedValue([] as never);
    (Member.findAll as jest.Mock).mockResolvedValue([]);

    await request(buildApp()).get('/api/members');

    const whereArg = findAllSpy.mock.calls[0][0]?.where as {
      role?: { [key: symbol]: string[] };
    };
    const roleFilter = whereArg?.role as unknown as Record<symbol, string[]>;
    const inSymbol = Object.getOwnPropertySymbols(roleFilter)[0];
    expect(roleFilter[inSymbol]).toEqual(expect.arrayContaining(['Member', 'Admin']));
  });

  it('includes each member\'s real tech stack, tagline, and availability', async () => {
    jest
      .spyOn(User, 'findAll')
      .mockResolvedValue([{ id: USER_ID, firstName: 'Jane', lastName: 'Doe', role: 'Member' }] as never);
    (Member.findAll as jest.Mock).mockResolvedValue([
      mockMemberRow(false, {
        skills: ['Frontend', 'AI'],
        tagline: 'Turning ideas into shipped products.',
        availability: true,
      }),
    ]);

    const res = await request(buildApp()).get('/api/members');

    expect(res.body.data.members[0]).toEqual(
      expect.objectContaining({
        techStack: ['Frontend', 'AI'],
        tagline: 'Turning ideas into shipped products.',
        available: true,
      }),
    );
  });

  it('falls back to an empty tech stack/tagline for a Member with no profile yet', async () => {
    jest
      .spyOn(User, 'findAll')
      .mockResolvedValue([{ id: USER_ID, firstName: 'New', lastName: 'Member', role: 'Member' }] as never);
    (Member.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/members');

    expect(res.body.data.members[0]).toEqual(
      expect.objectContaining({ techStack: [], tagline: '' }),
    );
  });

  it('includes an Admin who has filled out a real profile (non-empty skills)', async () => {
    jest
      .spyOn(User, 'findAll')
      .mockResolvedValue([{ id: USER_ID, firstName: 'David', lastName: 'K', role: 'Admin' }] as never);
    (Member.findAll as jest.Mock).mockResolvedValue([
      mockMemberRow(false, { skills: ['Frontend', 'Backend', 'AI'] }),
    ]);

    const res = await request(buildApp()).get('/api/members');

    expect(res.body.data.members).toHaveLength(1);
    expect(res.body.data.members[0].techStack).toEqual(['Frontend', 'Backend', 'AI']);
  });

  it('excludes an Admin whose only Member row has empty skills (an auto-provisioned stub, not a real profile)', async () => {
    jest
      .spyOn(User, 'findAll')
      .mockResolvedValue([{ id: USER_ID, firstName: 'Venus', lastName: 'Dev', role: 'Admin' }] as never);
    (Member.findAll as jest.Mock).mockResolvedValue([mockMemberRow(false, { skills: [] })]);

    const res = await request(buildApp()).get('/api/members');

    expect(res.body.data.members).toHaveLength(0);
    expect(res.body.totalItems).toBe(0);
  });

  it('excludes an Admin with no Member row at all', async () => {
    jest
      .spyOn(User, 'findAll')
      .mockResolvedValue([{ id: USER_ID, firstName: 'Eduard', lastName: 'N', role: 'Admin' }] as never);
    (Member.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/members');

    expect(res.body.data.members).toHaveLength(0);
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
