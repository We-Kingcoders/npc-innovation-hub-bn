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

const USER_ID = 'c1d1e1f1-1111-4111-8111-111111111111';
const MEMBER_ID = 'c2d2e2f2-2222-4222-8222-222222222222';

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

describe('Public member profile - education detail fields', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns department, startYear, endYear, and status once set', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(
      mockMemberInstance({
        education: {
          degree: 'Bachelor of Science in Computer Science',
          institution: 'University of Rwanda',
          department: 'College of Science and Technology',
          description: 'Focused on distributed systems.',
          imageUrl: 'https://example.com/edu.jpg',
          startYear: 2021,
          endYear: null,
          status: 'Currently Enrolled',
        },
      })
    );

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.education).toMatchObject({
      institution: 'University of Rwanda',
      department: 'College of Science and Technology',
      startYear: 2021,
      endYear: null,
      status: 'Currently Enrolled',
    });
  });
});

describe('PATCH /api/members/:userId/education - detail fields', () => {
  afterEach(() => jest.clearAllMocks());

  it('persists department, startYear, endYear, and status', async () => {
    const member = mockMemberInstance({ education: {} });
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}/education`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({
        institution: 'University of Rwanda',
        department: 'College of Science and Technology',
        startYear: 2021,
        endYear: null,
        status: 'Currently Enrolled',
      });

    expect(res.status).toBe(200);
    expect(member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        education: expect.objectContaining({
          institution: 'University of Rwanda',
          department: 'College of Science and Technology',
          startYear: 2021,
          endYear: null,
          status: 'Currently Enrolled',
        }),
      })
    );
  });

  it('rejects an invalid status value with 400', async () => {
    const member = mockMemberInstance({ education: {} });
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}/education`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ status: 'Made Up Status' });

    expect(res.status).toBe(400);
  });

  it('rejects a startYear outside a reasonable range with 400', async () => {
    const member = mockMemberInstance({ education: {} });
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}/education`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ startYear: 1800 });

    expect(res.status).toBe(400);
  });
});
