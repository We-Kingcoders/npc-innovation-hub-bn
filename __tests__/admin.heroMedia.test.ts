import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import adminHeroMediaRoutes from '../src/routes/admin/heroMedia.routes';
import HeroMedia from '../src/models/heroMedia.model';
import cloudinary from '../src/utils/cloudinary.utils';

// Only HeroMedia is module-mocked; User (its own uploadedBy association) is
// left real, since heroMedia.model.ts calls `HeroMedia.belongsTo(User, ...)`
// at import time, which needs User to be a genuine Sequelize Model
// subclass, not an automock. setDefaultHeroMedia/reorderHeroMedia both call
// the REAL sequelize.transaction() (only the model's own query methods are
// mocked), so this suite needs the real disposable test Postgres connected,
// same as admin.hubVideo.test.ts.
jest.mock('../src/models/heroMedia.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

// file-type is ESM-only (v17+); Jest's CJS-based module runtime can't load
// it even via the controller's dynamic import() (confirmed separately: the
// same dynamic import works fine under plain ts-node/Node at real
// runtime - this is a Jest-transform limitation, not a bug in the
// controller). Mocked here as the external boundary it is, same as
// cloudinary.utils above - the real sniffing logic this stands in for is
// exercised at real runtime, not by this test suite.
const mockFileTypeFromFile = jest.fn();
jest.mock('file-type', () => ({ fileTypeFromFile: (...args: unknown[]) => mockFileTypeFromFile(...args) }), {
  virtual: true,
});

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/hero-media', adminHeroMediaRoutes);
  return app;
}

function adminToken(): string {
  return jwt.sign({ id: 'a1111111-1111-4111-8111-111111111111', role: 'Admin' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

function memberToken(): string {
  return jwt.sign({ id: 'b2222222-2222-4222-8222-222222222222', role: 'Member' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

const EXISTING_ID = 'c3333333-3333-4333-8333-333333333333';
const OTHER_ID = 'd4444444-4444-4444-8444-444444444444';

// A real, minimal 1x1 transparent PNG - file-type reads real magic bytes,
// so a fake/garbage buffer can never pass the content-sniffing check no
// matter what Content-Type the request declares.
const REAL_PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

// A real, minimal MP4 ftyp box - enough for file-type to identify it as
// video/mp4 without needing a full, playable container.
const REAL_MP4_BYTES = Buffer.from([
  0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f,
  0x6d, 0x69, 0x73, 0x6f, 0x32, 0x61, 0x76, 0x63, 0x31, 0x6d, 0x70, 0x34, 0x31,
]);

function mockMediaRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: EXISTING_ID,
    type: 'IMAGE',
    url: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/hero-media/images/old.jpg',
    cloudinaryPublicId: 'innovation-hub/hero-media/images/old',
    thumbnailUrl: null,
    title: 'Old title',
    altText: 'Old alt',
    caption: null,
    isActive: true,
    isDefault: false,
    displayOrder: 0,
    uploadedBy: 'a1111111-1111-4111-8111-111111111111',
    update: jest.fn(),
    destroy: jest.fn(),
    ...overrides,
  };
  fields.update = fields.update ?? jest.fn();
  fields.destroy = fields.destroy ?? jest.fn();
  return fields;
}

afterEach(() => jest.clearAllMocks());

describe('POST /api/admin/hero-media', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).post('/api/admin/hero-media');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .post('/api/admin/hero-media')
      .set('Authorization', `Bearer ${memberToken()}`)
      .attach('file', REAL_PNG_BYTES, { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(buildApp())
      .post('/api/admin/hero-media')
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('title', 'Team at work');
    expect(res.status).toBe(400);
  });

  it('rejects a file whose declared Content-Type is not on the allowlist', async () => {
    const res = await request(buildApp())
      .post('/api/admin/hero-media')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', Buffer.from('not media'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('rejects a spoofed file - real text bytes declared as image/png - via content sniffing, not just the declared Content-Type', async () => {
    mockFileTypeFromFile.mockResolvedValue(undefined); // real sniff finds no recognizable signature
    const res = await request(buildApp())
      .post('/api/admin/hero-media')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', Buffer.from('definitely not a real png'), { filename: 'fake.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unrecognized file content/i);
    // Never reaches Cloudinary with an unverified file.
    expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
  });

  it('rejects a real image over the 10MB image limit', async () => {
    mockFileTypeFromFile.mockResolvedValue({ mime: 'image/png', ext: 'png' });
    const oversizedImage = Buffer.concat([REAL_PNG_BYTES, Buffer.alloc(11 * 1024 * 1024)]);
    const res = await request(buildApp())
      .post('/api/admin/hero-media')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', oversizedImage, { filename: 'huge.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/10MB/);
  }, 30000);

  it('rejects a file over the 100MB multer limit outright', async () => {
    const oversized = Buffer.alloc(101 * 1024 * 1024);
    const res = await request(buildApp())
      .post('/api/admin/hero-media')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', oversized, { filename: 'huge.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(400);
  }, 30000);

  it('uploads a real image, deriving type from sniffed content and appending it to the end of the display order', async () => {
    mockFileTypeFromFile.mockResolvedValue({ mime: 'image/png', ext: 'png' });
    (HeroMedia.max as jest.Mock).mockResolvedValue(2);
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/hero-media/images/new.png',
      public_id: 'innovation-hub/hero-media/images/new',
    });
    (HeroMedia.create as jest.Mock).mockResolvedValue(mockMediaRow({ id: 'new-id', type: 'IMAGE' }));

    const res = await request(buildApp())
      .post('/api/admin/hero-media')
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('altText', 'Students working together')
      .attach('file', REAL_PNG_BYTES, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ resource_type: 'image' }),
    );
    expect((HeroMedia.create as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        type: 'IMAGE',
        displayOrder: 3,
        altText: 'Students working together',
        thumbnailUrl: null,
      }),
    );
  });

  it('uploads a real video, deriving type from sniffed content and a poster thumbnailUrl', async () => {
    mockFileTypeFromFile.mockResolvedValue({ mime: 'video/mp4', ext: 'mp4' });
    (HeroMedia.max as jest.Mock).mockResolvedValue(null);
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hero-media/videos/new.mp4',
      public_id: 'innovation-hub/hero-media/videos/new',
    });
    (HeroMedia.create as jest.Mock).mockResolvedValue(mockMediaRow({ id: 'new-video-id', type: 'VIDEO' }));

    const res = await request(buildApp())
      .post('/api/admin/hero-media')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', REAL_MP4_BYTES, { filename: 'intro.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(201);
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ resource_type: 'video' }),
    );
    expect((HeroMedia.create as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        type: 'VIDEO',
        displayOrder: 0,
        thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hero-media/videos/new.jpg',
      }),
    );
  });
});

describe('GET /api/admin/hero-media', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).get('/api/admin/hero-media');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .get('/api/admin/hero-media')
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns the full list ordered by displayOrder, including cloudinaryPublicId', async () => {
    (HeroMedia.findAll as jest.Mock).mockResolvedValue([mockMediaRow()]);

    const res = await request(buildApp())
      .get('/api/admin/hero-media')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.media[0].cloudinaryPublicId).toBe('innovation-hub/hero-media/images/old');
    expect(HeroMedia.findAll).toHaveBeenCalledWith(expect.objectContaining({ order: [['displayOrder', 'ASC']] }));
  });
});

describe('PATCH /api/admin/hero-media/:id (metadata)', () => {
  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/hero-media/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${memberToken()}`)
      .send({ title: 'New title' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown id', async () => {
    (HeroMedia.findByPk as jest.Mock).mockResolvedValue(null);
    const res = await request(buildApp())
      .patch(`/api/admin/hero-media/${OTHER_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ title: 'New title' });
    expect(res.status).toBe(404);
  });

  it('updates only the provided metadata fields', async () => {
    const existing = mockMediaRow();
    (HeroMedia.findByPk as jest.Mock).mockResolvedValue(existing);

    const res = await request(buildApp())
      .patch(`/api/admin/hero-media/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ title: 'New title' });

    expect(res.status).toBe(200);
    expect((existing as { update: jest.Mock }).update).toHaveBeenCalledWith({ title: 'New title' });
  });
});

describe('PATCH /api/admin/hero-media/:id/activate and /deactivate', () => {
  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/hero-media/${EXISTING_ID}/activate`)
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('activates a media item', async () => {
    const existing = mockMediaRow({ isActive: false });
    (HeroMedia.findByPk as jest.Mock).mockResolvedValue(existing);

    const res = await request(buildApp())
      .patch(`/api/admin/hero-media/${EXISTING_ID}/activate`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect((existing as { update: jest.Mock }).update).toHaveBeenCalledWith({ isActive: true });
  });

  it('deactivates a media item', async () => {
    const existing = mockMediaRow({ isActive: true });
    (HeroMedia.findByPk as jest.Mock).mockResolvedValue(existing);

    const res = await request(buildApp())
      .patch(`/api/admin/hero-media/${EXISTING_ID}/deactivate`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect((existing as { update: jest.Mock }).update).toHaveBeenCalledWith({ isActive: false });
  });

  it('returns 404 for an unknown id', async () => {
    (HeroMedia.findByPk as jest.Mock).mockResolvedValue(null);
    const res = await request(buildApp())
      .patch(`/api/admin/hero-media/${OTHER_ID}/activate`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/hero-media/:id/default', () => {
  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/hero-media/${EXISTING_ID}/default`)
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown id, without unsetting any existing default', async () => {
    (HeroMedia.findByPk as jest.Mock).mockResolvedValue(null);
    const res = await request(buildApp())
      .patch(`/api/admin/hero-media/${OTHER_ID}/default`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
    expect(HeroMedia.update).not.toHaveBeenCalled();
  });

  it('unsets any existing default and sets this row as the new one', async () => {
    const target = mockMediaRow({ id: EXISTING_ID, isDefault: false });
    (HeroMedia.findByPk as jest.Mock).mockResolvedValue(target);
    (HeroMedia.update as jest.Mock).mockResolvedValue([1]);

    const res = await request(buildApp())
      .patch(`/api/admin/hero-media/${EXISTING_ID}/default`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    // Unsets any other default row first...
    expect((HeroMedia.update as jest.Mock).mock.calls[0][0]).toEqual({ isDefault: false });
    expect((HeroMedia.update as jest.Mock).mock.calls[0][1]).toEqual(
      expect.objectContaining({ where: { isDefault: true } }),
    );
    // ...then sets the target row itself, both inside the same transaction.
    expect((target as { update: jest.Mock }).update).toHaveBeenCalledWith(
      { isDefault: true },
      expect.objectContaining({ transaction: expect.anything() }),
    );
  });
});

describe('PATCH /api/admin/hero-media/reorder', () => {
  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .patch('/api/admin/hero-media/reorder')
      .set('Authorization', `Bearer ${memberToken()}`)
      .send([EXISTING_ID]);
    expect(res.status).toBe(403);
  });

  it('rejects an order array that does not exactly match the current set of ids', async () => {
    (HeroMedia.findAll as jest.Mock).mockResolvedValue([{ id: EXISTING_ID }, { id: OTHER_ID }]);

    const res = await request(buildApp())
      .patch('/api/admin/hero-media/reorder')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send([EXISTING_ID]); // missing OTHER_ID

    expect(res.status).toBe(400);
    expect(HeroMedia.update).not.toHaveBeenCalled();
  });

  it('rejects a duplicate id in the order array', async () => {
    (HeroMedia.findAll as jest.Mock).mockResolvedValue([{ id: EXISTING_ID }, { id: OTHER_ID }]);

    const res = await request(buildApp())
      .patch('/api/admin/hero-media/reorder')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send([EXISTING_ID, EXISTING_ID]);

    expect(res.status).toBe(400);
  });

  it('applies the new order when the array is exactly the current set', async () => {
    (HeroMedia.findAll as jest.Mock)
      .mockResolvedValueOnce([{ id: EXISTING_ID }, { id: OTHER_ID }]) // current-set check
      .mockResolvedValueOnce([mockMediaRow({ id: OTHER_ID, displayOrder: 0 }), mockMediaRow({ id: EXISTING_ID, displayOrder: 1 })]); // final re-fetch
    (HeroMedia.update as jest.Mock).mockResolvedValue([1]);

    const res = await request(buildApp())
      .patch('/api/admin/hero-media/reorder')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send([OTHER_ID, EXISTING_ID]);

    expect(res.status).toBe(200);
    expect(HeroMedia.update).toHaveBeenCalledWith(
      { displayOrder: 0 },
      expect.objectContaining({ where: { id: OTHER_ID } }),
    );
    expect(HeroMedia.update).toHaveBeenCalledWith(
      { displayOrder: 1 },
      expect.objectContaining({ where: { id: EXISTING_ID } }),
    );
  });
});

describe('DELETE /api/admin/hero-media/:id', () => {
  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .delete(`/api/admin/hero-media/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown id', async () => {
    (HeroMedia.findByPk as jest.Mock).mockResolvedValue(null);
    const res = await request(buildApp())
      .delete(`/api/admin/hero-media/${OTHER_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  it('deletes the Cloudinary asset (with the right resource_type) and the row', async () => {
    const existing = mockMediaRow({ type: 'VIDEO', cloudinaryPublicId: 'innovation-hub/hero-media/videos/old' });
    (HeroMedia.findByPk as jest.Mock).mockResolvedValue(existing);
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

    const res = await request(buildApp())
      .delete(`/api/admin/hero-media/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('innovation-hub/hero-media/videos/old', {
      resource_type: 'video',
    });
    expect((existing as { destroy: jest.Mock }).destroy).toHaveBeenCalled();
  });

  it('still deletes the row even when the Cloudinary asset deletion fails', async () => {
    const existing = mockMediaRow();
    (HeroMedia.findByPk as jest.Mock).mockResolvedValue(existing);
    (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(new Error('Cloudinary is down'));

    const res = await request(buildApp())
      .delete(`/api/admin/hero-media/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect((existing as { destroy: jest.Mock }).destroy).toHaveBeenCalled();
  });
});
