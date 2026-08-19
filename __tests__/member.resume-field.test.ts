import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import memberRoutes from '../src/routes/member.route';
import Member from '../src/models/member.model';
import cloudinary from '../src/utils/cloudinary.utils';

// Only Member is module-mocked; User is left real (Member.belongsTo(User, ...)
// at import time needs a genuine Sequelize Model subclass).
jest.mock('../src/models/member.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

const USER_ID = 'e1111111-2222-4333-8444-555555555555';
const MEMBER_ID = 'f2222222-3333-4444-8555-666666666666';

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

describe('Public member profile - resumeUrl default and value', () => {
  afterEach(() => jest.clearAllMocks());

  it('defaults resumeUrl to null for a member who never uploaded one', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(mockMemberInstance());

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.resumeUrl).toBeNull();
  });

  it('returns resumeUrl once a member has set it, distinct from cvUrl', async () => {
    (Member.findByPk as jest.Mock).mockResolvedValue(
      mockMemberInstance({
        cvUrl: 'https://res.cloudinary.com/demo/raw/upload/jane-cv.pdf',
        resumeUrl: 'https://res.cloudinary.com/demo/raw/upload/jane-resume.pdf',
      })
    );

    const res = await request(buildApp()).get(`/api/members/member/${MEMBER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.member.cvUrl).toBe('https://res.cloudinary.com/demo/raw/upload/jane-cv.pdf');
    expect(res.body.data.member.resumeUrl).toBe('https://res.cloudinary.com/demo/raw/upload/jane-resume.pdf');
  });
});

describe('PATCH /api/members/:userId - resume upload', () => {
  afterEach(() => jest.clearAllMocks());

  it('uploads a resume file to Cloudinary as a raw resource, distinct from the cv folder', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/raw/upload/jane-resume.pdf',
    });

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .attach('resume', Buffer.from('%PDF-1.4 fake resume content'), 'resume.pdf');

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ folder: 'innovation-hub/members/resume', resource_type: 'raw' })
    );
    expect(member.update).toHaveBeenCalledWith(
      expect.objectContaining({ resumeUrl: 'https://res.cloudinary.com/demo/raw/upload/jane-resume.pdf' })
    );
  });

  it('allows uploading a cv and a resume in the same request as two distinct files', async () => {
    const member = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(member);
    (cloudinary.uploader.upload as jest.Mock)
      .mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/demo/raw/upload/jane-cv.pdf' })
      .mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/demo/raw/upload/jane-resume.pdf' });

    const res = await request(buildApp())
      .patch(`/api/members/${USER_ID}`)
      .set('Authorization', `Bearer ${authToken()}`)
      .attach('cv', Buffer.from('%PDF-1.4 fake cv content'), 'cv.pdf')
      .attach('resume', Buffer.from('%PDF-1.4 fake resume content'), 'resume.pdf');

    expect(res.status).toBe(200);
    expect(member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cvUrl: 'https://res.cloudinary.com/demo/raw/upload/jane-cv.pdf',
        resumeUrl: 'https://res.cloudinary.com/demo/raw/upload/jane-resume.pdf',
      })
    );
  });
});
