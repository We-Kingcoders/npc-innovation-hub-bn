import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import memberRoutes from '../src/routes/member.route';
import Member from '../src/models/member.model';

// Only Member is module-mocked; User is left real (see member.public.test.ts
// for why Member.belongsTo(User, ...) needs a genuine Model subclass).
jest.mock('../src/models/member.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

const USER_ID = 'a1b1c1d1-1111-4111-8111-111111111111';
const MEMBER_ID = 'a2b2c2d2-2222-4222-8222-222222222222';

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

describe('Public member profile - hashtags default and value', () => {
  afterEach(() => jest.clearAllMocks());

  it('defaults hashtags to an empty array for a member who never set any', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(mockMemberInstance());

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.hashtags).toEqual([]);
  });

  it('returns the actual hashtags once set', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(
      mockMemberInstance({ hashtags: ['Full-StackDev', 'URStudent', 'InnovationHub'] })
    );

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.hashtags).toEqual(['Full-StackDev', 'URStudent', 'InnovationHub']);
  });
});

describe('PATCH /api/members/:userId - hashtags validation and persistence', () => {
  afterEach(() => jest.clearAllMocks());

  it('persists a valid set of hashtags', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .field('hashtags', JSON.stringify(['Full-StackDev', 'URStudent', 'InnovationHub']));

    expect(res.status).toBe(200);
    expect(member.update).toHaveBeenCalledWith(
      expect.objectContaining({ hashtags: ['Full-StackDev', 'URStudent', 'InnovationHub'] })
    );
  });

  it('rejects more than 6 hashtags with 400', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .field('hashtags', JSON.stringify(['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven']));

    expect(res.status).toBe(400);
  });

  it('rejects a hashtag entry longer than 30 characters with 400', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .field('hashtags', JSON.stringify(['x'.repeat(31)]));

    expect(res.status).toBe(400);
  });
});
