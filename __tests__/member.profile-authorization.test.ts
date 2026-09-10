// Regression coverage for a real IDOR vulnerability: every profile-mutation
// route in member.route.ts (:userId as a path param) only required
// `protectRoute` (any authenticated user), with no check anywhere that the
// caller actually owned that userId - any logged-in Member could edit, or
// even DELETE, any other member's entire profile just by putting a
// different userId in the URL. Fixed via assertOwnerOrAdmin in
// member.controller.ts; this file locks the fix in place.
import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import memberRoutes from '../src/routes/member.route';
import Member from '../src/models/member.model';

jest.mock('../src/models/member.model');

const OWNER_ID = 'a1111111-1111-4111-8111-111111111111';
const ATTACKER_ID = 'b2222222-2222-4222-8222-222222222222';
const ADMIN_ID = 'c3333333-3333-4333-8333-333333333333';

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/members', memberRoutes);
  return app;
}

function tokenFor(id: string, role: 'Member' | 'Admin' = 'Member'): string {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

function mockMemberInstance(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: 'member-row-id',
    userId: OWNER_ID,
    name: 'Jane Doe',
    role: 'Backend Developer',
    imageUrl: '/members-images/member-demo.jpg',
    bio: '',
    skills: [],
    ...overrides,
  };
  const instance: any = { ...fields, toJSON: () => fields };
  instance.update = jest.fn().mockImplementation((data: Record<string, unknown>) => {
    Object.assign(fields, data);
    Object.assign(instance, data);
    return instance;
  });
  instance.destroy = jest.fn().mockResolvedValue(undefined);
  return instance;
}

afterEach(() => jest.clearAllMocks());

describe('Member profile mutation routes reject a caller who is not the profile owner', () => {
  it('PATCH /api/members/:userId - 403 when the token belongs to a different member', async () => {
    (Member.findOne as jest.Mock).mockResolvedValue(mockMemberInstance());

    const res = await request(buildApp())
      .patch(`/api/members/${OWNER_ID}`)
      .set('Authorization', `Bearer ${tokenFor(ATTACKER_ID)}`)
      .send({ bio: 'hijacked' });

    expect(res.status).toBe(403);
  });

  it('PATCH /api/members/:userId - succeeds when the token belongs to the profile owner', async () => {
    (Member.findOne as jest.Mock).mockResolvedValue(mockMemberInstance());

    const res = await request(buildApp())
      .patch(`/api/members/${OWNER_ID}`)
      .set('Authorization', `Bearer ${tokenFor(OWNER_ID)}`)
      .send({ bio: 'my own update' });

    expect(res.status).toBe(200);
  });

  it('PATCH /api/members/:userId - succeeds for an Admin acting on someone else\'s profile', async () => {
    (Member.findOne as jest.Mock).mockResolvedValue(mockMemberInstance());

    const res = await request(buildApp())
      .patch(`/api/members/${OWNER_ID}`)
      .set('Authorization', `Bearer ${tokenFor(ADMIN_ID, 'Admin')}`)
      .send({ bio: 'admin edit' });

    expect(res.status).toBe(200);
  });

  it('PATCH /api/members/:userId/contacts - 403 when the token belongs to a different member', async () => {
    (Member.findOne as jest.Mock).mockResolvedValue(mockMemberInstance());

    const res = await request(buildApp())
      .patch(`/api/members/${OWNER_ID}/contacts`)
      .set('Authorization', `Bearer ${tokenFor(ATTACKER_ID)}`)
      .send({ github: 'https://github.com/attacker' });

    expect(res.status).toBe(403);
  });

  it('DELETE /api/members/:userId - 403 when the token belongs to a different member (would otherwise delete a stranger\'s entire profile)', async () => {
    (Member.findOne as jest.Mock).mockResolvedValue(mockMemberInstance());

    const res = await request(buildApp())
      .delete(`/api/members/${OWNER_ID}`)
      .set('Authorization', `Bearer ${tokenFor(ATTACKER_ID)}`);

    expect(res.status).toBe(403);
  });

  it('DELETE /api/members/:userId - succeeds when the token belongs to the profile owner', async () => {
    const instance = mockMemberInstance();
    (Member.findOne as jest.Mock).mockResolvedValue(instance);

    const res = await request(buildApp())
      .delete(`/api/members/${OWNER_ID}`)
      .set('Authorization', `Bearer ${tokenFor(OWNER_ID)}`);

    expect(res.status).toBe(200);
    expect(instance.destroy).toHaveBeenCalled();
  });
});
