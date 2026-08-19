import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import memberRoutes from '../src/routes/member.route';
import Member from '../src/models/member.model';
import cloudinary from '../src/utils/cloudinary.utils';

// Only Member is module-mocked; User is left real (see member.public.test.ts
// for why: Member.belongsTo(User, ...) needs a genuine Model subclass).
jest.mock('../src/models/member.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: {
    upload: jest.fn(),
    destroy: jest.fn(),
  },
}));

const USER_ID = 'e5555555-5555-4555-8555-555555555555';
const MEMBER_ID = 'f6666666-6666-4666-8666-666666666666';

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
  const instance: any = {
    ...fields,
    toJSON: () => fields,
  };
  instance.update = jest.fn().mockImplementation(async (data: Record<string, unknown>) => {
    Object.assign(fields, data);
    Object.assign(instance, data);
    return instance;
  });
  return instance;
}

describe('Public member profile - new field defaults', () => {
  afterEach(() => jest.clearAllMocks());

  it('defaults languages/cvUrl/tagline/availability for a member row that never set them', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(mockMemberInstance());

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.languages).toEqual([]);
    expect(res.body.data.member.cvUrl).toBeNull();
    expect(res.body.data.member.tagline).toBeNull();
    expect(res.body.data.member.availability).toBe(true);
  });

  it('returns the actual values once a member has set them', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(
      mockMemberInstance({
        languages: [{ name: 'English', level: 'Fluent' }],
        cvUrl: 'https://res.cloudinary.com/demo/raw/upload/cv.pdf',
        tagline: 'Backend dev who loves distributed systems',
        availability: false,
      })
    );

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.languages).toEqual([{ name: 'English', level: 'Fluent' }]);
    expect(res.body.data.member.cvUrl).toBe('https://res.cloudinary.com/demo/raw/upload/cv.pdf');
    expect(res.body.data.member.tagline).toBe('Backend dev who loves distributed systems');
    expect(res.body.data.member.availability).toBe(false);
  });
});

describe('PATCH /api/members/:userId - new field validation and persistence', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a tagline longer than 160 characters with 400', async () => {
    (Member.findOne as jest.Mock).mockResolvedValue(mockMemberInstance());

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .field('tagline', 'x'.repeat(161));

    expect(res.status).toBe(400);
  });

  it('rejects an invalid language level with 400', async () => {
    (Member.findOne as jest.Mock).mockResolvedValue(mockMemberInstance());

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .field('languages', JSON.stringify([{ name: 'French', level: 'Expert' }]));

    expect(res.status).toBe(400);
  });

  it('persists tagline, availability, and languages on a valid update', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .field('tagline', 'Loves shipping things')
      .field('availability', 'false')
      .field('languages', JSON.stringify([{ name: 'English', level: 'Native' }]));

    expect(res.status).toBe(200);
    expect(member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tagline: 'Loves shipping things',
        availability: false,
        languages: [{ name: 'English', level: 'Native' }],
      })
    );
  });

  it('uploads a CV file to Cloudinary as a raw resource and persists cvUrl', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/raw/upload/jane-cv.pdf',
    });

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .attach('cv', Buffer.from('%PDF-1.4 fake pdf content'), 'resume.pdf');

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ folder: 'innovation-hub/members/cv', resource_type: 'raw' })
    );
    expect(member.update).toHaveBeenCalledWith(
      expect.objectContaining({ cvUrl: 'https://res.cloudinary.com/demo/raw/upload/jane-cv.pdf' })
    );
  });
});
