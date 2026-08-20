import request from 'supertest';
import express, { Express } from 'express';
import applicationRoutes from '../src/routes/application.routes';
import Application from '../src/models/application.model';
import cloudinary from '../src/utils/cloudinary.utils';

jest.mock('../src/models/application.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/applications', applicationRoutes);
  return app;
}

function baseFields() {
  return {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    githubUrl: 'https://github.com/janedoe',
    skills: JSON.stringify(['Node.js', 'React']),
    phoneNumber: '+250700000000',
    gender: 'Female',
    strengths: 'Fast learner, strong problem solver.',
    weaknesses: 'Sometimes over-engineers solutions.',
  };
}

function attachLetter(req: request.Test) {
  return req.attach('applicationLetter', Buffer.from('%PDF-1.4 fake letter content'), 'letter.pdf');
}

describe('POST /api/applications', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates a pending application with an image', async () => {
    (Application.findOne as jest.Mock).mockResolvedValue(null);
    (cloudinary.uploader.upload as jest.Mock)
      .mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/demo/image/upload/jane.jpg' })
      .mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/demo/raw/upload/letter.pdf' });
    (Application.create as jest.Mock).mockResolvedValue({
      id: 'a1111111-1111-4111-8111-111111111111',
      ...baseFields(),
      skills: ['Node.js', 'React'],
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/jane.jpg',
      applicationLetterUrl: 'https://res.cloudinary.com/demo/raw/upload/letter.pdf',
      status: 'Pending',
    });

    let req = request(buildApp()).post('/api/applications');
    for (const [key, value] of Object.entries(baseFields())) {
      req = req.field(key, value);
    }
    req = req.attach('image', Buffer.from('fake image bytes'), 'photo.jpg');
    const res = await attachLetter(req);

    expect(res.status).toBe(201);
    expect(Application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Jane Doe',
        email: 'jane.doe@example.com',
        githubUrl: 'https://github.com/janedoe',
        skills: ['Node.js', 'React'],
        phoneNumber: '+250700000000',
        gender: 'Female',
        status: 'Pending',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/jane.jpg',
        applicationLetterUrl: 'https://res.cloudinary.com/demo/raw/upload/letter.pdf',
      })
    );
  });

  it('creates a pending application without an image (imageUrl null)', async () => {
    (Application.findOne as jest.Mock).mockResolvedValue(null);
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/raw/upload/letter.pdf',
    });
    (Application.create as jest.Mock).mockResolvedValue({ id: 'a2', ...baseFields(), status: 'Pending' });

    let req = request(buildApp()).post('/api/applications');
    for (const [key, value] of Object.entries(baseFields())) {
      req = req.field(key, value);
    }
    const res = await attachLetter(req);

    expect(res.status).toBe(201);
    expect(Application.create).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: null }));
  });

  it('rejects a submission missing the required application letter PDF', async () => {
    let req = request(buildApp()).post('/api/applications');
    for (const [key, value] of Object.entries(baseFields())) {
      req = req.field(key, value);
    }
    const res = await req;

    expect(res.status).toBe(400);
    expect(Application.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid email with 400', async () => {
    let req = request(buildApp()).post('/api/applications');
    for (const [key, value] of Object.entries({ ...baseFields(), email: 'not-an-email' })) {
      req = req.field(key, value);
    }
    const res = await attachLetter(req);

    expect(res.status).toBe(400);
  });

  it('rejects an invalid gender value with 400', async () => {
    let req = request(buildApp()).post('/api/applications');
    for (const [key, value] of Object.entries({ ...baseFields(), gender: 'Robot' })) {
      req = req.field(key, value);
    }
    const res = await attachLetter(req);

    expect(res.status).toBe(400);
  });

  it('rejects an invalid githubUrl with 400', async () => {
    let req = request(buildApp()).post('/api/applications');
    for (const [key, value] of Object.entries({ ...baseFields(), githubUrl: 'not-a-url' })) {
      req = req.field(key, value);
    }
    const res = await attachLetter(req);

    expect(res.status).toBe(400);
  });

  it('rejects an empty skills array with 400', async () => {
    let req = request(buildApp()).post('/api/applications');
    for (const [key, value] of Object.entries({ ...baseFields(), skills: JSON.stringify([]) })) {
      req = req.field(key, value);
    }
    const res = await attachLetter(req);

    expect(res.status).toBe(400);
  });

  it('rejects a duplicate pending application from the same email with a clear error, not a generic 500', async () => {
    (Application.findOne as jest.Mock).mockResolvedValue({ id: 'existing', email: 'jane.doe@example.com', status: 'Pending' });

    let req = request(buildApp()).post('/api/applications');
    for (const [key, value] of Object.entries(baseFields())) {
      req = req.field(key, value);
    }
    const res = await attachLetter(req);

    expect(res.status).toBe(409);
    expect(Application.create).not.toHaveBeenCalled();
  });
});
