import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import memberRoutes from '../src/routes/member.route';
import Member from '../src/models/member.model';

// Only Member is module-mocked; User is left real (Member.belongsTo(User, ...)
// at import time needs a genuine Sequelize Model subclass - see member.public.test.ts).
jest.mock('../src/models/member.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

const USER_ID = 'a7777777-7777-4777-8777-777777777777';
const MEMBER_ID = 'b8888888-8888-4888-8888-888888888888';

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

describe('PATCH /api/members/:userId/contacts - instagram replaces telegram', () => {
  afterEach(() => jest.clearAllMocks());

  it('accepts and persists an instagram link', async () => {
    const member = mockMemberInstance({ contacts: {} });
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}/contacts`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ instagram: 'https://instagram.com/janedoe' });

    expect(res.status).toBe(200);
    expect(member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        contacts: expect.objectContaining({ instagram: 'https://instagram.com/janedoe' }),
      })
    );
  });

  it('ignores a telegram field instead of persisting it', async () => {
    const member = mockMemberInstance({ contacts: {} });
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}/contacts`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ telegram: 'https://t.me/janedoe' });

    expect(res.status).toBe(200);
    const [[persistedArgs]] = (member.update as jest.Mock).mock.calls;
    expect(persistedArgs.contacts).not.toHaveProperty('telegram');
    expect(persistedArgs.contacts).not.toHaveProperty('instagram');
  });
});

describe('Public member profile contacts - never exposes telegram', () => {
  afterEach(() => jest.clearAllMocks());

  it('exposes instagram when set', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(
      mockMemberInstance({ contacts: { linkedin: 'https://linkedin.com/in/jane', instagram: 'https://instagram.com/jane' } })
    );

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.contacts.instagram).toBe('https://instagram.com/jane');
  });

  it('never exposes a legacy telegram value even if still present on the stored row', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(
      mockMemberInstance({ contacts: { linkedin: 'https://linkedin.com/in/jane', telegram: 'https://t.me/legacy' } })
    );

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.contacts).not.toHaveProperty('telegram');
    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('telegram');
  });
});
