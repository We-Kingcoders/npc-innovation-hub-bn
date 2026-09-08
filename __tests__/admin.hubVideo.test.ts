import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import adminHubVideoRoutes from '../src/routes/admin/hubVideo.routes';
import HubIntroVideo from '../src/models/hubIntroVideo.model';
import cloudinary from '../src/utils/cloudinary.utils';

// Only HubIntroVideo is module-mocked; User (its own uploadedBy association)
// is left real, since hubIntroVideo.model.ts calls
// `HubIntroVideo.belongsTo(User, ...)` at import time, which needs User to be
// a genuine Sequelize Model subclass, not an automock.
jest.mock('../src/models/hubIntroVideo.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/hub-video', adminHubVideoRoutes);
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

const EXISTING_VIDEO_ID = 'c3333333-3333-4333-8333-333333333333';

function mockVideoRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: EXISTING_VIDEO_ID,
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hub-video/old.mp4',
    cloudinaryPublicId: 'innovation-hub/hub-video/old',
    title: 'Old title',
    description: 'Old description',
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

describe('POST /api/admin/hub-video', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).post('/api/admin/hub-video');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .post('/api/admin/hub-video')
      .set('Authorization', `Bearer ${memberToken()}`)
      .attach('video', Buffer.from('fake mp4 bytes'), { filename: 'intro.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when no video file is attached', async () => {
    const res = await request(buildApp())
      .post('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('title', 'Meet the Hub');
    expect(res.status).toBe(400);
  });

  it('rejects a non-video file with 400', async () => {
    const res = await request(buildApp())
      .post('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('video', Buffer.from('not a video'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('rejects a video file over the 100MB limit with 400', async () => {
    const oversized = Buffer.alloc(101 * 1024 * 1024);
    const res = await request(buildApp())
      .post('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('video', oversized, { filename: 'huge.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(400);
  }, 30000);

  it('creates the first video when none exists yet, with no cleanup call', async () => {
    (HubIntroVideo.findOne as jest.Mock).mockResolvedValue(null);
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hub-video/new.mp4',
      public_id: 'innovation-hub/hub-video/new',
    });
    (HubIntroVideo.create as jest.Mock).mockResolvedValue({
      id: 'new-id',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hub-video/new.mp4',
      cloudinaryPublicId: 'innovation-hub/hub-video/new',
      title: 'Meet the Hub',
      description: null,
      uploadedBy: 'a1111111-1111-4111-8111-111111111111',
    });

    const res = await request(buildApp())
      .post('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('title', 'Meet the Hub')
      .attach('video', Buffer.from('fake mp4 bytes'), { filename: 'intro.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    // First arg is the row data; second is the transaction options object
    // (a real transaction, since only the model is mocked here) - only the
    // data half is worth asserting on.
    expect((HubIntroVideo.create as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hub-video/new.mp4',
        cloudinaryPublicId: 'innovation-hub/hub-video/new',
        title: 'Meet the Hub',
        uploadedBy: 'a1111111-1111-4111-8111-111111111111',
      })
    );
  });

  it('replaces the existing video: deletes the old Cloudinary asset and updates the same row', async () => {
    const existing = mockVideoRow();
    (HubIntroVideo.findOne as jest.Mock).mockResolvedValue(existing);
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hub-video/new.mp4',
      public_id: 'innovation-hub/hub-video/new',
    });

    const res = await request(buildApp())
      .post('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('video', Buffer.from('fake mp4 bytes'), { filename: 'intro.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('innovation-hub/hub-video/old', { resource_type: 'video' });
    expect(HubIntroVideo.create).not.toHaveBeenCalled();
    // First arg is the row data; second is the transaction options object.
    expect((existing as { update: jest.Mock }).update.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hub-video/new.mp4',
        cloudinaryPublicId: 'innovation-hub/hub-video/new',
      })
    );
  });

  it('still replaces the video even when deleting the old Cloudinary asset fails', async () => {
    const existing = mockVideoRow();
    (HubIntroVideo.findOne as jest.Mock).mockResolvedValue(existing);
    (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(new Error('Cloudinary is down'));
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/video/upload/v1/innovation-hub/hub-video/new.mp4',
      public_id: 'innovation-hub/hub-video/new',
    });

    const res = await request(buildApp())
      .post('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('video', Buffer.from('fake mp4 bytes'), { filename: 'intro.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(200);
    expect((existing as { update: jest.Mock }).update).toHaveBeenCalled();
  });
});

describe('GET /api/admin/hub-video', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).get('/api/admin/hub-video');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .get('/api/admin/hub-video')
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns the full record including cloudinaryPublicId and uploadedBy when one exists', async () => {
    (HubIntroVideo.findOne as jest.Mock).mockResolvedValue(mockVideoRow());

    const res = await request(buildApp())
      .get('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.video.cloudinaryPublicId).toBe('innovation-hub/hub-video/old');
    expect(res.body.data.video.uploadedBy).toBe('a1111111-1111-4111-8111-111111111111');
  });

  it('returns a null video with a clear message when none has been uploaded yet', async () => {
    (HubIntroVideo.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp())
      .get('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.video).toBeNull();
  });
});

describe('DELETE /api/admin/hub-video', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).delete('/api/admin/hub-video');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .delete('/api/admin/hub-video')
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when there is no video to delete', async () => {
    (HubIntroVideo.findAll as jest.Mock).mockResolvedValue([]);

    const res = await request(buildApp())
      .delete('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });

  it('deletes the Cloudinary asset and the row when a video exists', async () => {
    const existing = mockVideoRow();
    (HubIntroVideo.findAll as jest.Mock).mockResolvedValue([existing]);
    (HubIntroVideo.destroy as jest.Mock).mockResolvedValue(1);
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

    const res = await request(buildApp())
      .delete('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('innovation-hub/hub-video/old', { resource_type: 'video' });
    // Deletes every matching row in one bulk call, not the found instance
    // itself - a self-heal against duplicate rows (see SINGLETON_ORDER note
    // in the controller), so this asserts the static call, not an instance
    // .destroy().
    expect(HubIntroVideo.destroy).toHaveBeenCalledWith({ where: { id: [EXISTING_VIDEO_ID] } });
  });

  it('still deletes the row even when the Cloudinary asset deletion fails', async () => {
    const existing = mockVideoRow();
    (HubIntroVideo.findAll as jest.Mock).mockResolvedValue([existing]);
    (HubIntroVideo.destroy as jest.Mock).mockResolvedValue(1);
    (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(new Error('Cloudinary is down'));

    const res = await request(buildApp())
      .delete('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(HubIntroVideo.destroy).toHaveBeenCalledWith({ where: { id: [EXISTING_VIDEO_ID] } });
  });

  it('deletes every row when more than one exists (self-heal against a duplicate)', async () => {
    const first = mockVideoRow({ id: EXISTING_VIDEO_ID, cloudinaryPublicId: 'innovation-hub/hub-video/old' });
    const second = mockVideoRow({ id: 'd4444444-4444-4444-8444-444444444444', cloudinaryPublicId: 'innovation-hub/hub-video/stray' });
    (HubIntroVideo.findAll as jest.Mock).mockResolvedValue([first, second]);
    (HubIntroVideo.destroy as jest.Mock).mockResolvedValue(2);
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

    const res = await request(buildApp())
      .delete('/api/admin/hub-video')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
    expect(HubIntroVideo.destroy).toHaveBeenCalledWith({
      where: { id: [EXISTING_VIDEO_ID, 'd4444444-4444-4444-8444-444444444444'] },
    });
  });
});
