import request from 'supertest';
import express, { Express } from 'express';
import hubVideoRoutes from '../src/routes/hubVideo.routes';
import HubIntroVideo from '../src/models/hubIntroVideo.model';

// Only HubIntroVideo is module-mocked; User (its own uploadedBy association)
// is left real, since hubIntroVideo.model.ts calls
// `HubIntroVideo.belongsTo(User, ...)` at import time, which needs User to
// be a genuine Sequelize Model subclass, not an automock.
jest.mock('../src/models/hubIntroVideo.model');

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/hub-video', hubVideoRoutes);
  return app;
}

function mockVideoRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: 'f1111111-1111-4111-8111-111111111111',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hub-video/intro.mp4',
    cloudinaryPublicId: 'innovation-hub/hub-video/intro',
    title: 'Meet the Hub',
    description: 'A quick look at what we do.',
    uploadedBy: 'a1111111-1111-4111-8111-111111111111',
    ...overrides,
  };
  return { ...fields, toJSON: () => fields };
}

describe('GET /api/hub-video (public)', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 without an Authorization header', async () => {
    (HubIntroVideo.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/hub-video');

    expect(res.status).toBe(200);
  });

  it('returns videoUrl/title/description when a video exists - never cloudinaryPublicId or uploadedBy', async () => {
    (HubIntroVideo.findOne as jest.Mock).mockResolvedValue(mockVideoRow());

    const res = await request(buildApp()).get('/api/hub-video');

    expect(res.status).toBe(200);
    expect(res.body.data.video).toEqual({
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hub-video/intro.mp4',
      title: 'Meet the Hub',
      description: 'A quick look at what we do.',
    });
    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('cloudinarypublicid');
    expect(body).not.toContain('uploadedby');
    expect(body).not.toContain('f1111111-1111-4111-8111-111111111111');
  });

  it('returns a null video (not a 404 or error) when none has been uploaded yet', async () => {
    (HubIntroVideo.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/hub-video');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.video).toBeNull();
  });
});
