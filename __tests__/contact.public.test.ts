import request from 'supertest';
import express, { Express } from 'express';
import contactRoutes from '../src/routes/contact.routes';
import ContactMessage from '../src/models/contactMessage.model';
import { sendEmail } from '../src/utils/emailService';

// ContactMessage has no associations (no belongsTo(User) etc.) so it's
// safe to mock outright with no "keep the target real" caveat. emailService
// is mocked as the external boundary - no test here should make a real
// SMTP connection.
jest.mock('../src/models/contactMessage.model');
jest.mock('../src/utils/emailService', () => ({ sendEmail: jest.fn() }));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/contact', contactRoutes);
  return app;
}

function mockCreatedMessage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'e1111111-1111-4111-8111-111111111111',
    name: 'Jane Visitor',
    email: 'jane@example.com',
    message: 'Hello, I have a question.',
    status: 'Pending',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

const VALID_PAYLOAD = {
  name: 'Jane Visitor',
  email: 'jane@example.com',
  message: 'Hello, I have a question about joining the hub.',
};

describe('POST /api/contact', () => {
  beforeEach(() => {
    (ContactMessage.create as jest.Mock).mockResolvedValue(mockCreatedMessage());
    (sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it('rejects a missing name with 400', async () => {
    const res = await request(buildApp())
      .post('/api/contact')
      .send({ email: 'jane@example.com', message: 'Hello' });
    expect(res.status).toBe(400);
    expect(ContactMessage.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid email with 400', async () => {
    const res = await request(buildApp())
      .post('/api/contact')
      .send({ name: 'Jane', email: 'not-an-email', message: 'Hello' });
    expect(res.status).toBe(400);
  });

  it('rejects an empty message with 400', async () => {
    const res = await request(buildApp())
      .post('/api/contact')
      .send({ name: 'Jane', email: 'jane@example.com', message: '' });
    expect(res.status).toBe(400);
  });

  it('rejects a message over 5000 characters with 400', async () => {
    const res = await request(buildApp())
      .post('/api/contact')
      .send({ name: 'Jane', email: 'jane@example.com', message: 'a'.repeat(5001) });
    expect(res.status).toBe(400);
  });

  it('stores the message and sends the submitter a confirmation email at the address they typed', async () => {
    const res = await request(buildApp()).post('/api/contact').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(ContactMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane Visitor', email: 'jane@example.com', status: 'Pending' }),
    );

    const confirmationCall = (sendEmail as jest.Mock).mock.calls.find(
      (call) => call[0].to === 'jane@example.com',
    );
    expect(confirmationCall).toBeDefined();
    expect(confirmationCall[0].html).toMatch(/review it as soon as possible/i);
  });

  it('also notifies the hub inbox of the new message', async () => {
    const original = process.env.CONTACT_NOTIFICATION_EMAIL;
    process.env.CONTACT_NOTIFICATION_EMAIL = 'hub-inbox@example.com';

    await request(buildApp()).post('/api/contact').send(VALID_PAYLOAD);

    const notificationCall = (sendEmail as jest.Mock).mock.calls.find(
      (call) => call[0].to === 'hub-inbox@example.com',
    );
    expect(notificationCall).toBeDefined();

    process.env.CONTACT_NOTIFICATION_EMAIL = original;
  });

  it('escapes HTML in the submitted name/message before it reaches the email body', async () => {
    const maliciousPayload = {
      name: '<img src=x onerror=alert(1)>',
      email: 'attacker@example.com',
      message: '<script>alert("xss")</script>',
    };
    (ContactMessage.create as jest.Mock).mockResolvedValue(mockCreatedMessage(maliciousPayload));

    await request(buildApp()).post('/api/contact').send(maliciousPayload);

    const confirmationCall = (sendEmail as jest.Mock).mock.calls.find(
      (call) => call[0].to === 'attacker@example.com',
    );
    expect(confirmationCall[0].html).not.toContain('<script>');
    expect(confirmationCall[0].html).not.toContain('<img src=x onerror=');
    expect(confirmationCall[0].html).toContain('&lt;script&gt;');
  });

  it('still returns 201 and never fails the request when the confirmation email fails to send', async () => {
    (sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP is down'));

    const res = await request(buildApp()).post('/api/contact').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(ContactMessage.create).toHaveBeenCalled();
  });

  it('returns a friendly success message without leaking internals', async () => {
    const res = await request(buildApp()).post('/api/contact').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/review it/i);
    expect(res.body.data.contactMessage).toEqual(
      expect.objectContaining({ id: expect.any(String), email: 'jane@example.com' }),
    );
  });
});
