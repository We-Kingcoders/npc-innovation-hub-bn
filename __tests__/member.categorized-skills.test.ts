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

const USER_ID = 'd1e1f1a1-1111-4111-8111-111111111111';
const MEMBER_ID = 'd2e2f2a2-2222-4222-8222-222222222222';

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

describe('Public member profile - skillCategories grouping', () => {
  afterEach(() => jest.clearAllMocks());

  it('groups skillDetails by category with a computed, rounded overall percentage', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(
      mockMemberInstance({
        skillDetails: [
          { name: 'React', technologies: ['React'], percent: 90, category: 'Frontend Development' },
          { name: 'CSS', technologies: ['CSS'], percent: 71, category: 'Frontend Development' },
          { name: 'Node.js', technologies: ['Node.js'], percent: 80, category: 'Backend Development' },
        ],
      })
    );

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    // (90 + 71) / 2 = 80.5 -> rounds to 81 (nearest whole number)
    expect(res.body.data.member.skillCategories).toEqual([
      {
        category: 'Frontend Development',
        overall: 81,
        skills: [
          { name: 'React', technologies: ['React'], percent: 90, category: 'Frontend Development' },
          { name: 'CSS', technologies: ['CSS'], percent: 71, category: 'Frontend Development' },
        ],
      },
      {
        category: 'Backend Development',
        overall: 80,
        skills: [{ name: 'Node.js', technologies: ['Node.js'], percent: 80, category: 'Backend Development' }],
      },
    ]);
  });

  it('buckets a skill without a category into Other', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(
      mockMemberInstance({
        skillDetails: [{ name: 'Legacy Skill', technologies: [], percent: 50 }],
      })
    );

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.skillCategories).toEqual([
      { category: 'Other', overall: 50, skills: [{ name: 'Legacy Skill', technologies: [], percent: 50 }] },
    ]);
  });

  it('still returns the raw skillDetails list unchanged, for backward compatibility', async () => {
    const skillDetails = [{ name: 'React', technologies: ['React'], percent: 90, category: 'Frontend Development' }];
    (Member.findByPk as jest.Mock).mockResolvedValue(mockMemberInstance({ skillDetails }));

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.skillDetails).toEqual(skillDetails);
  });

  it('returns an empty skillCategories array for a member with no skills', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(mockMemberInstance({ skillDetails: undefined }));

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.skillCategories).toEqual([]);
  });
});

describe('PATCH /api/members/:userId/skills - category validation and persistence', () => {
  afterEach(() => jest.clearAllMocks());

  it('persists a valid category on each skill entry', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}/skills`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({
        skillDetails: [{ name: 'React', technologies: ['React'], percent: 90, category: 'Frontend Development' }],
      });

    expect(res.status).toBe(200);
    expect(member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        skillDetails: [{ name: 'React', technologies: ['React'], percent: 90, category: 'Frontend Development' }],
      })
    );
  });

  it('rejects an invalid category value with 400', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}/skills`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({
        skillDetails: [{ name: 'React', technologies: ['React'], percent: 90, category: 'Made Up Category' }],
      });

    expect(res.status).toBe(400);
  });
});
