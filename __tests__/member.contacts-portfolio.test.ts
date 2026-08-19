import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import memberRoutes from '../src/routes/member.route';
import Member from '../src/models/member.model';

// Only Member is module-mocked; User is left real (Member.belongsTo(User, ...)
// at import time needs a genuine Sequelize Model subclass).
jest.mock('../src/models/member.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

const USER_ID = 'b1c1d1e1-1111-4111-8111-111111111111';
const MEMBER_ID = 'b2c2d2e2-2222-4222-8222-222222222222';

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

describe('PATCH /api/members/:userId/contacts - portfolio link', () => {
  afterEach(() => jest.clearAllMocks());

  it('accepts and persists a portfolio link alongside existing contacts', async () => {
    const member = mockMemberInstance({ contacts: { linkedin: 'https://linkedin.com/in/janedoe' } });
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}/contacts`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ portfolio: 'https://janedoe.dev' });

    expect(res.status).toBe(200);
    expect(member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        contacts: expect.objectContaining({
          linkedin: 'https://linkedin.com/in/janedoe',
          portfolio: 'https://janedoe.dev',
        }),
      })
    );
  });
});

describe('Public member profile contacts - portfolio link', () => {
  afterEach(() => jest.clearAllMocks());

  it('exposes portfolio alongside linkedin, github, twitter, and instagram', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(
      mockMemberInstance({
        contacts: {
          linkedin: 'https://linkedin.com/in/jane',
          github: 'https://github.com/jane',
          twitter: 'https://twitter.com/jane',
          instagram: 'https://instagram.com/jane',
          portfolio: 'https://janedoe.dev',
        },
      })
    );

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.contacts).toEqual({
      linkedin: 'https://linkedin.com/in/jane',
      github: 'https://github.com/jane',
      twitter: 'https://twitter.com/jane',
      instagram: 'https://instagram.com/jane',
      portfolio: 'https://janedoe.dev',
    });
  });

  it('defaults portfolio to undefined (omitted) when a member has no contacts at all', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(mockMemberInstance({ contacts: undefined }));

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.contacts).toBeUndefined();
  });
});
