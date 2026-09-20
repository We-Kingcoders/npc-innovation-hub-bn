// Regression coverage for the route-level RBAC hardening in
// resource.routes.ts and user.route.ts: both files' Admin-only mutation
// routes previously relied entirely on an in-controller
// `currentUser.role !== 'Admin'` check, with no restrictTo('Admin') at the
// route itself - functionally correct, but nothing here would have caught
// someone adding a new route without copying that check. These tests
// exercise the actual HTTP layer (not the controller logic) to confirm a
// Member token is rejected before ever reaching the controller, and an
// Admin token is not blocked by the role check.
// No model mocks here (deliberately): resource.model.ts defines
// Resource.belongsTo(User, ...) at module load time, and jest.mock()-ing
// User replaces it with an auto-mock that isn't a real Sequelize.Model
// subclass, which makes that association setup throw as soon as
// resource.routes.ts is imported - before any test even runs. Every
// assertion below only cares about the role-check middleware rejecting
// (or not rejecting) a request before it reaches the controller, so the
// requests are left to run against the real disposable test database
// (already schema-synced by this suite's globalSetup) instead.
import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import resourceRoutes from '../src/routes/resource.routes';
import userRoutes from '../src/routes/user.route';

const MEMBER_ID = 'd4444444-4444-4444-8444-444444444444';
const ADMIN_ID = 'e5555555-5555-4555-8555-555555555555';
const TARGET_ID = 'f6666666-6666-4666-8666-666666666666';

function tokenFor(id: string, role: 'Member' | 'Admin'): string {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/resources', resourceRoutes);
  app.use('/api/users', userRoutes);
  return app;
}

describe('resource.routes.ts - Admin-only mutations enforced at the route', () => {
  const app = buildApp();

  it('POST /api/resources - 403 for a Member', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${tokenFor(MEMBER_ID, 'Member')}`)
      .field('title', 'Should be rejected');

    expect(res.status).toBe(403);
  });

  it('POST /api/resources - not blocked by role check for an Admin', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${tokenFor(ADMIN_ID, 'Admin')}`)
      .field('title', 'Admin created resource');

    expect(res.status).not.toBe(403);
  });

  it('PUT /api/resources/:id - 403 for a Member', async () => {
    const res = await request(app)
      .put(`/api/resources/${TARGET_ID}`)
      .set('Authorization', `Bearer ${tokenFor(MEMBER_ID, 'Member')}`)
      .field('title', 'Should be rejected');

    expect(res.status).toBe(403);
  });

  it('PATCH /api/resources/:id - 403 for a Member', async () => {
    const res = await request(app)
      .patch(`/api/resources/${TARGET_ID}`)
      .set('Authorization', `Bearer ${tokenFor(MEMBER_ID, 'Member')}`)
      .field('title', 'Should be rejected');

    expect(res.status).toBe(403);
  });

  it('DELETE /api/resources/:id - 403 for a Member', async () => {
    const res = await request(app)
      .delete(`/api/resources/${TARGET_ID}`)
      .set('Authorization', `Bearer ${tokenFor(MEMBER_ID, 'Member')}`);

    expect(res.status).toBe(403);
  });

  it('DELETE /api/resources/:id - not blocked by role check for an Admin', async () => {
    const res = await request(app)
      .delete(`/api/resources/${TARGET_ID}`)
      .set('Authorization', `Bearer ${tokenFor(ADMIN_ID, 'Admin')}`);

    expect(res.status).not.toBe(403);
  });

  it('GET /api/resources - any authenticated user is allowed through the role check', async () => {
    const res = await request(app)
      .get('/api/resources')
      .set('Authorization', `Bearer ${tokenFor(MEMBER_ID, 'Member')}`);

    expect(res.status).not.toBe(403);
  });
});

describe('user.route.ts - role/status changes enforced at the route', () => {
  const app = buildApp();

  it('PATCH /api/users/:id/role - 403 for a Member', async () => {
    const res = await request(app)
      .patch(`/api/users/${TARGET_ID}/role`)
      .set('Authorization', `Bearer ${tokenFor(MEMBER_ID, 'Member')}`)
      .send({ role: 'Admin' });

    expect(res.status).toBe(403);
  });

  it('PATCH /api/users/:id/role - not blocked by role check for an Admin', async () => {
    const res = await request(app)
      .patch(`/api/users/${TARGET_ID}/role`)
      .set('Authorization', `Bearer ${tokenFor(ADMIN_ID, 'Admin')}`)
      .send({ role: 'Admin' });

    expect(res.status).not.toBe(403);
  });

  it('PATCH /api/users/change-account-status/:id - 403 for a Member', async () => {
    const res = await request(app)
      .patch(`/api/users/change-account-status/${TARGET_ID}`)
      .set('Authorization', `Bearer ${tokenFor(MEMBER_ID, 'Member')}`)
      .send({ isActive: false });

    expect(res.status).toBe(403);
  });

  it('PATCH /api/users/change-account-status/:id - not blocked by role check for an Admin', async () => {
    const res = await request(app)
      .patch(`/api/users/change-account-status/${TARGET_ID}`)
      .set('Authorization', `Bearer ${tokenFor(ADMIN_ID, 'Admin')}`)
      .send({ isActive: false });

    expect(res.status).not.toBe(403);
  });

  it('DELETE /api/users/:id - a Member is NOT blocked by role (owner-or-admin is enforced in the controller, not the route)', async () => {
    const res = await request(app)
      .delete(`/api/users/${MEMBER_ID}`)
      .set('Authorization', `Bearer ${tokenFor(MEMBER_ID, 'Member')}`);

    expect(res.status).not.toBe(403);
  });
});
