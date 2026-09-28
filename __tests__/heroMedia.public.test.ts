import request from 'supertest';
import express, { Express } from 'express';
import heroMediaRoutes from '../src/routes/heroMedia.routes';
import HeroMedia from '../src/models/heroMedia.model';

// Only HeroMedia is module-mocked - it has no association targets other
// models rely on being real (unlike HeroFeaturedMember's Member/User
// chain), so nothing else needs special handling here.
jest.mock('../src/models/heroMedia.model');

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/hero-media', heroMediaRoutes);
  return app;
}

function mockMediaRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: 'e1111111-1111-4111-8111-111111111111',
    type: 'IMAGE',
    url: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/hero-media/images/one.jpg',
    cloudinaryPublicId: 'innovation-hub/hero-media/images/one',
    thumbnailUrl: null,
    title: 'Internal title - never public',
    altText: 'Students collaborating in the lab',
    caption: 'Internal caption - never public',
    isActive: true,
    isDefault: false,
    displayOrder: 0,
    uploadedBy: 'a1111111-1111-4111-8111-111111111111',
    ...overrides,
  };
  return { ...fields, toJSON: () => fields };
}

describe('GET /api/hero-media (public)', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 200 without an Authorization header', async () => {
    (HeroMedia.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/hero-media');

    expect(res.status).toBe(200);
  });

  it('queries only active rows, the default item first if any, then by displayOrder', async () => {
    const findAllSpy = (HeroMedia.findAll as jest.Mock).mockResolvedValue([]);

    await request(buildApp()).get('/api/hero-media');

    expect(findAllSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        order: [['isDefault', 'DESC'], ['displayOrder', 'ASC']],
      }),
    );
  });

  it('projects to id/type/url/thumbnailUrl/altText only - never internal or unused fields', async () => {
    (HeroMedia.findAll as jest.Mock).mockResolvedValue([
      mockMediaRow(),
      mockMediaRow({
        id: 'e2222222-2222-4222-8222-222222222222',
        type: 'VIDEO',
        url: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hero-media/videos/two.mp4',
        cloudinaryPublicId: 'innovation-hub/hero-media/videos/two',
        thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hero-media/videos/two.jpg',
        altText: null,
        displayOrder: 1,
      }),
    ]);

    const res = await request(buildApp()).get('/api/hero-media');

    expect(res.status).toBe(200);
    expect(res.body.data.media).toEqual([
      {
        id: 'e1111111-1111-4111-8111-111111111111',
        type: 'IMAGE',
        url: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/hero-media/images/one.jpg',
        thumbnailUrl: null,
        altText: 'Students collaborating in the lab',
      },
      {
        id: 'e2222222-2222-4222-8222-222222222222',
        type: 'VIDEO',
        url: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hero-media/videos/two.mp4',
        thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hero-media/videos/two.jpg',
        altText: null,
      },
    ]);
    const body = JSON.stringify(res.body).toLowerCase();
    expect(body).not.toContain('cloudinarypublicid');
    expect(body).not.toContain('uploadedby');
    expect(body).not.toContain('displayorder');
    expect(body).not.toContain('isdefault');
    expect(body).not.toContain('never public');
  });

  it('returns an empty list when no media is active', async () => {
    (HeroMedia.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/hero-media');

    expect(res.status).toBe(200);
    expect(res.body.data.media).toEqual([]);
  });
});
