import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import memberRoutes from '../src/routes/member.route';
import Member from '../src/models/member.model';
import User from '../src/models/user.model';

// Only Member is module-mocked; User is left real because member.model.ts
// calls `Member.belongsTo(User, ...)` at import time, which needs a genuine
// Sequelize Model subclass (see member.public.test.ts for the full reasoning).
jest.mock('../src/models/member.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

const USER_ID = 'c9999999-9999-4999-8999-999999999999';
const MEMBER_ID = 'd0000000-0000-4000-8000-000000000000';

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/members', memberRoutes);
  return app;
}

function authToken(): string {
  return jwt.sign({ id: USER_ID, role: 'Member' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

function mockMemberInstance(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: MEMBER_ID,
    userId: USER_ID,
    name: 'Jane Doe',
    role: 'Backend Developer',
    imageUrl: '/members-images/member-demo.jpg',
    bio: '',
    skills: [],
    ...overrides,
  };
  const instance: any = { ...fields, toJSON: () => fields };
  instance.update = jest.fn().mockImplementation(async (data: Record<string, unknown>) => {
    Object.assign(fields, data);
    Object.assign(instance, data);
    return instance;
  });
  return instance;
}

describe('PATCH /api/members/:userId - role specialization validation', () => {
  afterEach(() => jest.clearAllMocks());

  it('accepts a valid specialization value', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .field('role', 'Frontend Developer');

    expect(res.status).toBe(200);
    expect(member.update).toHaveBeenCalledWith(expect.objectContaining({ role: 'Frontend Developer' }));
  });

  it('rejects a role value outside the specialization list with 400', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .field('role', 'Not A Real Specialization');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/members/:userId - new profile role default', () => {
  afterEach(() => jest.clearAllMocks());

  it('defaults a new profile created without a role to "Other", not the literal "Member"', async () => {
    (Member.findOne as jest.Mock).mockResolvedValue(null);
    (Member.create as jest.Mock).mockImplementation(async (data) => mockMemberInstance(data));

    const res = await request(buildApp())
      .post(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .field('name', 'New Member');

    expect(res.status).toBe(201);
    expect(Member.create as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Other' })
    );
  });
});

describe('GET /api/members (public list) - role default for profile-less users', () => {
  afterEach(() => jest.clearAllMocks());

  it('displays "Other" instead of the generic "Member" for a user without a profile row', async () => {
    jest.spyOn(User, 'findAndCountAll').mockResolvedValue({
      count: 1,
      rows: [{ id: USER_ID, firstName: 'New', lastName: 'User' }],
    } as never);
    (Member.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/members');

    expect(res.status).toBe(200);
    expect(res.body.data.members[0].role).toBe('Other');
  });
});

describe('Public member projections include role', () => {
  afterEach(() => jest.clearAllMocks());

  it('includes role in the detail projection', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(mockMemberInstance({ role: 'DevOps Engineer' }));

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.role).toBe('DevOps Engineer');
  });
});
