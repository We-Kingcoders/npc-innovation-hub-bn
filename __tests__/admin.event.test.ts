import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import eventRoutes from '../src/routes/event.routes';
import Event from '../src/models/event.model';
import cloudinary from '../src/utils/cloudinary.utils';

// Neither Event nor Attendance is module-mocked here (unlike
// admin.hubVideo.test.ts's model): attendance.model.ts calls
// Attendance.belongsTo(Event, ...) at import time, and Event similarly has
// its own associations - an automock on Event stops being a genuine
// Sequelize Model subclass, which breaks *other* models' association setup,
// not just Event's own. Instead, spy on Event's static methods directly so
// the model keeps its real class identity everywhere it's referenced, while
// still letting each test control what create/findByPk return. deleteEvent's
// real Attendance.destroy({ where: { eventId } }) call runs for real against
// the test DB - harmless, since there's never a matching row for the event
// IDs used here.
jest.mock('../src/utils/cloudinary.utils', () => ({
  uploader: { upload: jest.fn(), destroy: jest.fn() },
}));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/events', eventRoutes);
  return app;
}

function adminToken(): string {
  return jwt.sign({ id: 'a1111111-1111-4111-8111-111111111111', role: 'Admin' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

const EXISTING_EVENT_ID = 'e5555555-5555-4555-8555-555555555555';
const VALID_BODY = {
  title: 'Hub Demo Day',
  location: 'Main Hall',
  description: 'End-of-cohort project showcase.',
  startTime: '2026-10-01T09:00:00.000Z',
  endTime: '2026-10-01T12:00:00.000Z',
};

// Returns a plain object shaped like an Event instance, cast to Event so it
// satisfies findByPk's real Sequelize-typed return - Event itself isn't
// mocked here (see the note above), so its methods keep their real,
// stricter signatures instead of jest.Mock's permissive one.
function mockEventRow(overrides: Partial<Record<string, unknown>> = {}): Event {
  const fields: Record<string, unknown> = {
    id: EXISTING_EVENT_ID,
    title: 'Old title',
    location: 'Old location',
    description: 'Old description',
    startTime: new Date('2026-09-01T09:00:00.000Z'),
    endTime: new Date('2026-09-01T12:00:00.000Z'),
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/events/old.jpg',
    update: jest.fn(),
    destroy: jest.fn(),
    ...overrides,
  };
  fields.update = fields.update ?? jest.fn();
  fields.destroy = fields.destroy ?? jest.fn();
  return fields as unknown as Event;
}

afterEach(() => jest.clearAllMocks());

describe('POST /api/events (admin) - imageUrl fallback', () => {
  // The admin form (EventFormModal.tsx) collects an image as a pasted URL,
  // not a file upload - createEvent only ever set imageUrl from a Cloudinary
  // file upload, so an admin-typed URL was silently discarded on every
  // create. These pin down the fallback that fixes that.

  it('creates the event using the admin-typed imageUrl when no file is uploaded', async () => {
    jest.spyOn(Event, 'create').mockResolvedValue({
      id: 'new-id',
      ...VALID_BODY,
      imageUrl: 'https://example.com/banner.jpg',
    });

    const res = await request(buildApp())
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...VALID_BODY, imageUrl: 'https://example.com/banner.jpg' });

    expect(res.status).toBe(201);
    expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
    expect(Event.create).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: 'https://example.com/banner.jpg' }),
    );
  });

  it('ignores a non-http imageUrl rather than storing it', async () => {
    jest.spyOn(Event, 'create').mockResolvedValue({ id: 'new-id', ...VALID_BODY, imageUrl: undefined });

    const res = await request(buildApp())
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...VALID_BODY, imageUrl: 'javascript:alert(1)' });

    expect(res.status).toBe(201);
    expect(Event.create).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: undefined }),
    );
  });

  it('prefers an uploaded file over a typed imageUrl when both are somehow present', async () => {
    (cloudinary.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/events/new.jpg',
    });
    jest.spyOn(Event, 'create').mockResolvedValue({ id: 'new-id', ...VALID_BODY });

    const res = await request(buildApp())
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('title', VALID_BODY.title)
      .field('location', VALID_BODY.location)
      .field('description', VALID_BODY.description)
      .field('startTime', VALID_BODY.startTime)
      .field('endTime', VALID_BODY.endTime)
      .field('imageUrl', 'https://example.com/ignored.jpg')
      .attach('image', Buffer.from('fake image bytes'), { filename: 'banner.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(cloudinary.uploader.upload).toHaveBeenCalled();
    expect(Event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/innovation-hub/events/new.jpg',
      }),
    );
  });
});

describe('PATCH /api/events/:id (admin) - imageUrl fallback', () => {
  it('updates imageUrl from an admin-typed URL when no file is uploaded', async () => {
    const existing = mockEventRow();
    jest.spyOn(Event, 'findByPk').mockResolvedValue(existing);

    const res = await request(buildApp())
      .patch(`/api/events/${EXISTING_EVENT_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ imageUrl: 'https://example.com/updated.jpg' });

    expect(res.status).toBe(200);
    expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
    expect((existing as unknown as { update: jest.Mock }).update).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: 'https://example.com/updated.jpg' }),
    );
  });

  it('leaves imageUrl untouched when none is provided', async () => {
    const existing = mockEventRow();
    jest.spyOn(Event, 'findByPk').mockResolvedValue(existing);

    const res = await request(buildApp())
      .patch(`/api/events/${EXISTING_EVENT_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ title: 'New title only' });

    expect(res.status).toBe(200);
    expect((existing as unknown as { update: jest.Mock }).update).toHaveBeenCalledWith(
      expect.not.objectContaining({ imageUrl: expect.anything() }),
    );
  });
});

describe('DELETE /api/events/:id (admin)', () => {
  it('deletes the event', async () => {
    const existing = mockEventRow();
    jest.spyOn(Event, 'findByPk').mockResolvedValue(existing);

    const res = await request(buildApp())
      .delete(`/api/events/${EXISTING_EVENT_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect((existing as unknown as { destroy: jest.Mock }).destroy).toHaveBeenCalled();
  });

  it('returns 404 for a non-existent event', async () => {
    jest.spyOn(Event, 'findByPk').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/events/${EXISTING_EVENT_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });
});
