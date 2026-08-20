import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import adminApplicationRoutes from '../src/routes/admin/application.routes';
import Application from '../src/models/application.model';
import { sendTemplateEmail, EmailTemplate } from '../src/utils/email.utils';

// Application is module-mocked because its own `Application.belongsTo(User, ...)`
// association setup needs User to stay a real Sequelize Model subclass - User
// is never mocked here. email.utils is module-mocked so no test ever sends a
// real email; only sendTemplateEmail's call args are asserted on.
jest.mock('../src/models/application.model');
jest.mock('../src/utils/email.utils');

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/applications', adminApplicationRoutes);
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

const APPLICATION_ID = 'c3333333-3333-4333-8333-333333333333';

function mockApplicationRow(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: APPLICATION_ID,
    imageUrl: null,
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    githubUrl: 'https://github.com/janedoe',
    skills: ['Node.js', 'React'],
    phoneNumber: '+250788000000',
    gender: 'Female',
    strengths: 'Fast learner',
    weaknesses: 'Public speaking',
    applicationLetterUrl: 'https://cloudinary.example.com/letters/jane.pdf',
    status: 'Pending',
    reviewedBy: null,
    reviewedAt: null,
    update: jest.fn(),
    ...overrides,
  };
  fields.update = fields.update ?? jest.fn();
  return fields;
}

afterEach(() => jest.restoreAllMocks());

describe('GET /api/admin/applications', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).get('/api/admin/applications');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .get('/api/admin/applications')
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns all applications when no status filter is given', async () => {
    (Application.findAll as jest.Mock).mockResolvedValue([mockApplicationRow()]);

    const res = await request(buildApp())
      .get('/api/admin/applications')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(1);
    expect(Application.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('filters by ?status=Pending', async () => {
    (Application.findAll as jest.Mock).mockResolvedValue([mockApplicationRow()]);

    const res = await request(buildApp())
      .get('/api/admin/applications?status=Pending')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(Application.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'Pending' } }));
  });
});

describe('GET /api/admin/applications/:id', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).get(`/api/admin/applications/${APPLICATION_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .get(`/api/admin/applications/${APPLICATION_ID}`)
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when the application does not exist', async () => {
    (Application.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp())
      .get(`/api/admin/applications/${APPLICATION_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns the full application record', async () => {
    (Application.findByPk as jest.Mock).mockResolvedValue(mockApplicationRow());

    const res = await request(buildApp())
      .get(`/api/admin/applications/${APPLICATION_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.application.email).toBe('jane@example.com');
  });
});

describe('PATCH /api/admin/applications/:id/reject', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).patch(`/api/admin/applications/${APPLICATION_ID}/reject`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp())
      .patch(`/api/admin/applications/${APPLICATION_ID}/reject`)
      .set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when the application does not exist', async () => {
    (Application.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/admin/applications/${APPLICATION_ID}/reject`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 409 when the application has already been decided', async () => {
    (Application.findByPk as jest.Mock).mockResolvedValue(mockApplicationRow({ status: 'Rejected' }));

    const res = await request(buildApp())
      .patch(`/api/admin/applications/${APPLICATION_ID}/reject`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(409);
    expect(sendTemplateEmail).not.toHaveBeenCalled();
  });

  it('sends a rejection email and updates status/reviewedBy/reviewedAt on success', async () => {
    const row = mockApplicationRow();
    (Application.findByPk as jest.Mock).mockResolvedValue(row);
    (sendTemplateEmail as jest.Mock).mockResolvedValue(undefined);

    const res = await request(buildApp())
      .patch(`/api/admin/applications/${APPLICATION_ID}/reject`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ reason: 'Not enough relevant experience yet' });

    expect(res.status).toBe(200);
    expect(sendTemplateEmail).toHaveBeenCalledWith(
      'jane@example.com',
      EmailTemplate.APPLICATION_REJECTED,
      expect.objectContaining({ firstName: 'Jane Doe', reason: 'Not enough relevant experience yet' })
    );
    expect((row as { update: jest.Mock }).update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Rejected',
        reviewedBy: 'a1111111-1111-4111-8111-111111111111',
      })
    );
  });

  it('does not update the application when the rejection email fails to send', async () => {
    const row = mockApplicationRow();
    (Application.findByPk as jest.Mock).mockResolvedValue(row);
    (sendTemplateEmail as jest.Mock).mockRejectedValue(new Error('SMTP down'));

    const res = await request(buildApp())
      .patch(`/api/admin/applications/${APPLICATION_ID}/reject`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(500);
    expect((row as { update: jest.Mock }).update).not.toHaveBeenCalled();
  });
});
