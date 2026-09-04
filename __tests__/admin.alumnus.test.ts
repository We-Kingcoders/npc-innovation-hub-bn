import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import adminAlumnusRoutes from '../src/routes/admin/alumnus.routes';
import Alumnus from '../src/models/alumnus.model';
import cloudinary from '../src/utils/cloudinary.utils';

// Only Alumnus is module-mocked; User (its own createdBy association) is
// left real, since alumnus.model.ts calls `Alumnus.belongsTo(User, ...)` at
// import time, which needs User to be a genuine Sequelize Model subclass,
// not an automock.
jest.mock('../src/models/alumnus.model');
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/alumni', adminAlumnusRoutes);
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

const ALUMNUS_ID = 'c3333333-3333-4333-8333-333333333333';

function mockAlumnusRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: ALUMNUS_ID,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/alumni/old.jpg',
    cloudinaryPublicId: 'innovation-hub/alumni/old',
    fullName: 'Jane Doe',
    role: 'Backend Developer',
    createdBy: 'a1111111-1111-4111-8111-111111111111',
    update: jest.fn(),
    destroy: jest.fn(),
    ...overrides,
  };
  fields.update = fields.update ?? jest.fn();
  fields.destroy = fields.destroy ?? jest.fn();
  return fields;
}

afterEach(() => jest.clearAllMocks());

describe('POST /api/admin/alumni', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).post('/api/admin/alumni');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .post('/api/admin/alumni')
      .set('Authorization', `Bearer ${memberToken()}`)
      .field('fullName', 'Jane Doe')
      .field('role', 'Backend Developer');
    expect(res.status).toBe(403);
  });

  it('returns 400 when fullName is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/alumni')
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('role', 'Backend Developer');
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid role', async () => {
    const res = await request(buildApp())
      .post('/api/admin/alumni')
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('fullName', 'Jane Doe')
      .field('role', 'Astronaut');
    expect(res.status).toBe(400);
  });

  it('creates an alumnus with a photo', async () => {
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/alumni/new.jpg',
      public_id: 'innovation-hub/alumni/new',
    });
    (Alumnus.create as jest.Mock).mockResolvedValue({
      id: 'new-id',
      fullName: 'Jane Doe',
      role: 'Backend Developer',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/alumni/new.jpg',
      cloudinaryPublicId: 'innovation-hub/alumni/new',
    });

    const res = await request(buildApp())
      .post('/api/admin/alumni')
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('fullName', 'Jane Doe')
      .field('role', 'Backend Developer')
      .attach('image', Buffer.from('fake image bytes'), 'photo.jpg');

    expect(res.status).toBe(201);
    expect(Alumnus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Jane Doe',
        role: 'Backend Developer',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/alumni/new.jpg',
        cloudinaryPublicId: 'innovation-hub/alumni/new',
        createdBy: 'a1111111-1111-4111-8111-111111111111',
      })
    );
  });

  it('creates an alumnus without a photo (imageUrl/cloudinaryPublicId null)', async () => {
    (Alumnus.create as jest.Mock).mockResolvedValue({ id: 'new-id', fullName: 'Jane Doe', role: 'Backend Developer' });

    const res = await request(buildApp())
      .post('/api/admin/alumni')
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('fullName', 'Jane Doe')
      .field('role', 'Backend Developer');

    expect(res.status).toBe(201);
    expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
    expect(Alumnus.create).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: null, cloudinaryPublicId: null })
    );
  });
});

describe('GET /api/admin/alumni', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).get('/api/admin/alumni');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp()).get('/api/admin/alumni').set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns the list of standalone alumni', async () => {
    (Alumnus.findAll as jest.Mock).mockResolvedValue([mockAlumnusRow()]);

    const res = await request(buildApp()).get('/api/admin/alumni').set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(1);
  });
});

describe('PATCH /api/admin/alumni/:id', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).patch(`/api/admin/alumni/${ALUMNUS_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/alumni/${ALUMNUS_ID}`)
      .set('Authorization', `Bearer ${memberToken()}`)
      .field('fullName', 'Jane Updated');
    expect(res.status).toBe(403);
  });

  it('returns 404 when the alumnus does not exist', async () => {
    (Alumnus.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/admin/alumni/${ALUMNUS_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('fullName', 'Jane Updated');

    expect(res.status).toBe(404);
  });

  it('updates fields without a new photo, leaving the existing image untouched', async () => {
    const existing = mockAlumnusRow();
    (Alumnus.findByPk as jest.Mock).mockResolvedValue(existing);

    const res = await request(buildApp())
      .patch(`/api/admin/alumni/${ALUMNUS_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('fullName', 'Jane Updated');

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    expect((existing as { update: jest.Mock }).update).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Jane Updated' })
    );
  });

  it('replaces the photo: deletes the old Cloudinary asset and stores the new one', async () => {
    const existing = mockAlumnusRow();
    (Alumnus.findByPk as jest.Mock).mockResolvedValue(existing);
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/alumni/new.jpg',
      public_id: 'innovation-hub/alumni/new',
    });

    const res = await request(buildApp())
      .patch(`/api/admin/alumni/${ALUMNUS_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('image', Buffer.from('fake image bytes'), 'photo.jpg');

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('innovation-hub/alumni/old', { resource_type: 'image' });
    expect((existing as { update: jest.Mock }).update).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/alumni/new.jpg',
        cloudinaryPublicId: 'innovation-hub/alumni/new',
      })
    );
  });

  it('still replaces the photo even when deleting the old Cloudinary asset fails', async () => {
    const existing = mockAlumnusRow();
    (Alumnus.findByPk as jest.Mock).mockResolvedValue(existing);
    (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(new Error('Cloudinary is down'));
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/alumni/new.jpg',
      public_id: 'innovation-hub/alumni/new',
    });

    const res = await request(buildApp())
      .patch(`/api/admin/alumni/${ALUMNUS_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('image', Buffer.from('fake image bytes'), 'photo.jpg');

    expect(res.status).toBe(200);
    expect((existing as { update: jest.Mock }).update).toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/alumni/:id', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).delete(`/api/admin/alumni/${ALUMNUS_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .delete(`/api/admin/alumni/${ALUMNUS_ID}`)
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when the alumnus does not exist', async () => {
    (Alumnus.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/admin/alumni/${ALUMNUS_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });

  it('deletes the Cloudinary asset and the row when a photo exists', async () => {
    const existing = mockAlumnusRow();
    (Alumnus.findByPk as jest.Mock).mockResolvedValue(existing);
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

    const res = await request(buildApp())
      .delete(`/api/admin/alumni/${ALUMNUS_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('innovation-hub/alumni/old', { resource_type: 'image' });
    expect((existing as { destroy: jest.Mock }).destroy).toHaveBeenCalled();
  });

  it('deletes the row without calling Cloudinary when the alumnus never had a photo', async () => {
    const existing = mockAlumnusRow({ imageUrl: null, cloudinaryPublicId: null });
    (Alumnus.findByPk as jest.Mock).mockResolvedValue(existing);

    const res = await request(buildApp())
      .delete(`/api/admin/alumni/${ALUMNUS_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    expect((existing as { destroy: jest.Mock }).destroy).toHaveBeenCalled();
  });

  it('still deletes the row even when the Cloudinary asset deletion fails', async () => {
    const existing = mockAlumnusRow();
    (Alumnus.findByPk as jest.Mock).mockResolvedValue(existing);
    (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(new Error('Cloudinary is down'));

    const res = await request(buildApp())
      .delete(`/api/admin/alumni/${ALUMNUS_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect((existing as { destroy: jest.Mock }).destroy).toHaveBeenCalled();
  });
});
