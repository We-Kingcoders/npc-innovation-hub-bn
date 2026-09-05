import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import { protectRoute } from '../src/middlewares/auth.middleware';
import { getAllUsers } from '../src/controllers/user.controller';
import User from '../src/models/user.model';

// Only Member is module-mocked; User is left real, since member.model.ts
// calls `Member.belongsTo(User, ...)` and `User.hasOne(Member, ...)` at
// import time, which needs both classes to be genuine Sequelize Model
// subclasses at that moment - mocking Member is safe (matches the pattern
// used throughout this session) because Jest's automock still executes the
// real module body once (wiring the real associations) before substituting
// the mock for later imports.
//
// The app under test wires only the /users route directly from the
// controller and middleware, rather than importing src/routes/user.route.ts
// - that file has a pre-existing, unrelated TS error on its google-auth
// route that trips ts-jest's type-checking when the whole router module is
// loaded (same workaround as user.loginPasswordExpiry.test.ts).
jest.mock('../src/models/member.model');

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  router.get('/users', protectRoute, getAllUsers);
  app.use('/api/users', router);
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

const MEMBER_USER_ID = 'c3333333-3333-4333-8333-333333333333';
const MEMBER_ID = 'd4444444-4444-4444-8444-444444444444';
const ADMIN_USER_ID = 'e5555555-5555-4555-8555-555555555555';

function mockMemberRoleUser() {
  const dataValues = {
    id: MEMBER_USER_ID,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'hashed-password-should-never-appear',
    phone: '+250700000000',
    image: null,
    gender: 'Female',
    verified: true,
    role: 'Member',
    isActive: true,
    isTemporaryPassword: false,
    passwordExpiresAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    Member: { id: MEMBER_ID },
  };
  return { dataValues };
}

function mockAdminRoleUser() {
  const dataValues = {
    id: ADMIN_USER_ID,
    firstName: 'Alex',
    lastName: 'Admin',
    email: 'alex@example.com',
    password: 'hashed-password-should-never-appear',
    phone: null,
    image: null,
    gender: null,
    verified: true,
    role: 'Admin',
    isActive: true,
    isTemporaryPassword: false,
    passwordExpiresAt: null,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    Member: null,
  };
  return { dataValues };
}

afterEach(() => jest.restoreAllMocks());

describe('GET /api/users/users', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await request(buildApp()).get('/api/users/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-Admin token', async () => {
    const res = await request(buildApp()).get('/api/users/users').set('Authorization', `Bearer ${memberToken()}`);
    expect(res.status).toBe(403);
  });

  it('queries User.findAll with a Member include, not a separate query per user', async () => {
    jest.spyOn(User, 'findAll').mockResolvedValue([] as never);

    await request(buildApp()).get('/api/users/users').set('Authorization', `Bearer ${adminToken()}`);

    expect(User.findAll).toHaveBeenCalledTimes(1);
    const callArgs = (User.findAll as jest.Mock).mock.calls[0][0];
    expect(callArgs.include).toEqual(expect.arrayContaining([expect.objectContaining({ model: expect.anything() })]));
  });

  it('returns memberId populated for a user with an associated Member', async () => {
    jest.spyOn(User, 'findAll').mockResolvedValue([mockMemberRoleUser()] as never);

    const res = await request(buildApp()).get('/api/users/users').set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users[0].memberId).toBe(MEMBER_ID);
  });

  it('returns memberId: null for a user with no associated Member (e.g. an Admin)', async () => {
    jest.spyOn(User, 'findAll').mockResolvedValue([mockAdminRoleUser()] as never);

    const res = await request(buildApp()).get('/api/users/users').set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users[0].memberId).toBeNull();
  });

  it('never leaks the password field, and does not leak a raw nested Member object', async () => {
    jest.spyOn(User, 'findAll').mockResolvedValue([mockMemberRoleUser()] as never);

    const res = await request(buildApp()).get('/api/users/users').set('Authorization', `Bearer ${adminToken()}`);

    const user = res.body.data.users[0];
    expect(user.password).toBeUndefined();
    expect(user.Member).toBeUndefined();
  });

  it('regression: every existing field is still present and unchanged, plus the new memberId field', async () => {
    jest.spyOn(User, 'findAll').mockResolvedValue([mockMemberRoleUser()] as never);

    const res = await request(buildApp()).get('/api/users/users').set('Authorization', `Bearer ${adminToken()}`);

    expect(res.body.data.users[0]).toEqual({
      id: MEMBER_USER_ID,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+250700000000',
      image: null,
      gender: 'Female',
      verified: true,
      role: 'Member',
      isActive: true,
      isTemporaryPassword: false,
      passwordExpiresAt: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      memberId: MEMBER_ID,
    });
  });
});
