// Regression coverage for a mass-assignment vulnerability: PUT
// /api/admin/hire-inquiries/:id spread the entire request body straight
// into inquiry.update({ ...req.body, updated_at: new Date() }) - low
// impact since the route is already Admin-only, but it still let any
// field in the request (id, created_at, or anything else) overwrite the
// row unguarded, whether from a stray typo in an admin client or a
// forged request. The real frontend caller (updateHireInquiryStatus)
// only ever sends { status, notes? }, so status is now the only field
// this endpoint actually accepts.
//
// hire.controller.ts doesn't import the User/Member/Notification models
// (unlike user.controller.ts), so mocking HireUsInquiry directly here
// doesn't hit the association-setup trap the other __tests__ files work
// around - protectRoute also never queries the database, it only
// verifies the JWT and sets req.user from the decoded payload.
import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import hireRoutes from '../src/routes/admin/hire.routes';
import HireUsInquiry from '../src/models/hireUsInquiry.model';

jest.mock('../src/models/hireUsInquiry.model');

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/hire-inquiries', hireRoutes);
  return app;
}

function adminToken(): string {
  return jwt.sign(
    { id: 'admin-1', role: 'Admin', email: 'admin@example.com', firstName: 'Ad', lastName: 'Min' },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' },
  );
}

describe('PUT /api/admin/hire-inquiries/:id - mass assignment', () => {
  afterEach(() => jest.clearAllMocks());

  it('only ever updates status, ignoring every other field in the request body', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const inquiry = { id: 'real-id', status: 'Pending', update: mockUpdate };
    (HireUsInquiry.findByPk as jest.Mock).mockResolvedValue(inquiry);

    const res = await request(buildApp())
      .put('/api/admin/hire-inquiries/real-id')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        status: 'Contacted',
        id: 'attacker-id',
        email: 'attacker@evil.com',
        first_name: 'Attacker',
        created_at: '2000-01-01',
        notes: 'not a real column',
      });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'Contacted' });
  });
});
