import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import adminContactRoutes from '../src/routes/admin/contact.routes';
import ContactMessage from '../src/models/contactMessage.model';
import { sendEmail } from '../src/utils/emailService';

jest.mock('../src/models/contactMessage.model');
jest.mock('../src/utils/emailService', () => ({ sendEmail: jest.fn() }));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/contact-messages', adminContactRoutes);
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

function mockMessageRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: EXISTING_ID,
    name: 'Jane Visitor',
    email: 'jane@example.com',
    message: 'Hello, I have a question.',
    status: 'Pending',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    update: jest.fn(),
    destroy: jest.fn(),
    ...overrides,
  };
  fields.update = fields.update ?? jest.fn();
  fields.destroy = fields.destroy ?? jest.fn();
  return fields;
}

afterEach(() => jest.clearAllMocks());

describe('GET /api/admin/contact-messages', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).get('/api/admin/contact-messages');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .get('/api/admin/contact-messages')
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns the paginated list for an Admin', async () => {
    (ContactMessage.findAndCountAll as jest.Mock).mockResolvedValue({ count: 1, rows: [mockMessageRow()] });

    const res = await request(buildApp())
      .get('/api/admin/contact-messages')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.contactMessages).toHaveLength(1);
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('filters by status when provided', async () => {
    const spy = (ContactMessage.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

    await request(buildApp())
      .get('/api/admin/contact-messages')
      .query({ status: 'Reviewed' })
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(spy.mock.calls[0][0].where).toEqual(expect.objectContaining({ status: 'Reviewed' }));
  });
});

describe('GET /api/admin/contact-messages/:id', () => {
  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .get(`/api/admin/contact-messages/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown id', async () => {
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(null);
    const res = await request(buildApp())
      .get(`/api/admin/contact-messages/${OTHER_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns the message for a known id', async () => {
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(mockMessageRow());
    const res = await request(buildApp())
      .get(`/api/admin/contact-messages/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.contactMessage.email).toBe('jane@example.com');
  });
});

describe('PATCH /api/admin/contact-messages/:id', () => {
  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/contact-messages/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${memberToken()}`)
      .send({ status: 'Reviewed' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown id', async () => {
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(null);
    const res = await request(buildApp())
      .patch(`/api/admin/contact-messages/${OTHER_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'Reviewed' });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid status value', async () => {
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(mockMessageRow());
    const res = await request(buildApp())
      .patch(`/api/admin/contact-messages/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'NotARealStatus' });
    expect(res.status).toBe(400);
  });

  it('updates the status via an explicit allow-list, not a raw body spread', async () => {
    const existing = mockMessageRow();
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(existing);

    const res = await request(buildApp())
      .patch(`/api/admin/contact-messages/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'Closed', id: 'attacker-supplied-id', email: 'hijacked@example.com' });

    expect(res.status).toBe(200);
    expect((existing as { update: jest.Mock }).update).toHaveBeenCalledWith({ status: 'Closed' });
  });
});

describe('DELETE /api/admin/contact-messages/:id', () => {
  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .delete(`/api/admin/contact-messages/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown id', async () => {
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(null);
    const res = await request(buildApp())
      .delete(`/api/admin/contact-messages/${OTHER_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  it('deletes the message for a known id', async () => {
    const existing = mockMessageRow();
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(existing);

    const res = await request(buildApp())
      .delete(`/api/admin/contact-messages/${EXISTING_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(204);
    expect((existing as { destroy: jest.Mock }).destroy).toHaveBeenCalled();
  });
});

describe('POST /api/admin/contact-messages/:id/reply', () => {
  beforeEach(() => {
    (sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .post(`/api/admin/contact-messages/${EXISTING_ID}/reply`)
      .set('Authorization', `Bearer ${memberToken()}`)
      .send({ subject: 'Re: your message', message: 'Thanks for reaching out.' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when subject or message is missing', async () => {
    const res = await request(buildApp())
      .post(`/api/admin/contact-messages/${EXISTING_ID}/reply`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ subject: 'Re: your message' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(null);
    const res = await request(buildApp())
      .post(`/api/admin/contact-messages/${OTHER_ID}/reply`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ subject: 'Re: your message', message: 'Thanks for reaching out.' });
    expect(res.status).toBe(404);
  });

  it('sends the reply to the submitter\'s email and marks a Pending message Reviewed', async () => {
    const existing = mockMessageRow({ status: 'Pending' });
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(existing);

    const res = await request(buildApp())
      .post(`/api/admin/contact-messages/${EXISTING_ID}/reply`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ subject: 'Re: your message', message: 'Thanks for reaching out, here is more info.' });

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jane@example.com', subject: 'Re: your message' }),
    );
    expect((existing as { update: jest.Mock }).update).toHaveBeenCalledWith({ status: 'Reviewed' });
  });

  it('does not re-mark an already-Reviewed message', async () => {
    const existing = mockMessageRow({ status: 'Reviewed' });
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(existing);

    await request(buildApp())
      .post(`/api/admin/contact-messages/${EXISTING_ID}/reply`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ subject: 'Re: your message', message: 'Following up.' });

    expect((existing as { update: jest.Mock }).update).not.toHaveBeenCalled();
  });

  it('escapes HTML in the admin-authored reply body', async () => {
    const existing = mockMessageRow();
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(existing);

    await request(buildApp())
      .post(`/api/admin/contact-messages/${EXISTING_ID}/reply`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ subject: 'Re: your message', message: '<script>alert(1)</script>' });

    const call = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(call.html).not.toContain('<script>');
    expect(call.html).toContain('&lt;script&gt;');
  });

  it('returns 500 without changing status when the reply email fails to send', async () => {
    const existing = mockMessageRow({ status: 'Pending' });
    (ContactMessage.findByPk as jest.Mock).mockResolvedValue(existing);
    (sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP is down'));

    const res = await request(buildApp())
      .post(`/api/admin/contact-messages/${EXISTING_ID}/reply`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ subject: 'Re: your message', message: 'Thanks for reaching out.' });

    expect(res.status).toBe(500);
    expect((existing as { update: jest.Mock }).update).not.toHaveBeenCalled();
  });
});
