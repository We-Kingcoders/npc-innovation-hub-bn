import request from 'supertest';
import express, { Express } from 'express';
import { userLogin } from '../src/controllers/user.controller';
import { validateUserLogin } from '../src/validations/user.validation';
import { UserService } from '../src/services/user.services';
import { comparePassword } from '../src/utils/password.utils';

// UserService and password.utils are module-mocked to drive userLogin's new
// temporary-password-expiry branch directly, without touching the real DB or
// bcrypt. otp.middleware is module-mocked so the "not expired" paths (which
// fall through to the pre-existing OTP step) never hit User.findOne/sendEmail.
//
// The app under test wires only the login route directly from the controller
// and validation middleware, rather than importing src/routes/user.route.ts -
// that file has a pre-existing, unrelated TS error (confirmed present on
// main before this feature) on its google-auth route that trips ts-jest's
// type-checking when the whole router module is loaded.
jest.mock('../src/services/user.services');
jest.mock('../src/utils/password.utils');
jest.mock('../src/middlewares/otp.middleware', () => ({
  sendOTP: jest.fn((req, res, next) => next()),
}));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  router.post('/login', validateUserLogin, userLogin);
  app.use('/api/users', router);
  return app;
}

function mockUser(overrides: Partial<Record<string, unknown>> = {}) {
  const fields: Record<string, unknown> = {
    id: 'a1111111-1111-4111-8111-111111111111',
    firstName: 'Jane',
    email: 'jane@example.com',
    password: 'hashed-password',
    role: 'Member',
    isActive: true,
    verified: true,
    isTemporaryPassword: false,
    passwordExpiresAt: null,
    ...overrides,
  };
  return { ...fields, dataValues: { ...fields } };
}

afterEach(() => jest.restoreAllMocks());

describe('POST /api/users/login - temporary password expiry', () => {
  it('rejects login when isTemporaryPassword is true and passwordExpiresAt is in the past', async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(
      mockUser({
        isTemporaryPassword: true,
        passwordExpiresAt: new Date(Date.now() - 60 * 1000),
      })
    );
    (comparePassword as jest.Mock).mockResolvedValue(true);

    const res = await request(buildApp())
      .post('/api/users/login')
      .send({ email: 'jane@example.com', password: 'TempPass123!' });

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('expired');
    expect(JSON.stringify(res.body).toLowerCase()).toContain('forgot password');
  });

  it('does not reject when isTemporaryPassword is true but passwordExpiresAt is still in the future', async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(
      mockUser({
        isTemporaryPassword: true,
        passwordExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
    );
    (comparePassword as jest.Mock).mockResolvedValue(true);

    const res = await request(buildApp())
      .post('/api/users/login')
      .send({ email: 'jane@example.com', password: 'TempPass123!' });

    expect(res.status).not.toBe(403);
  });

  it('does not reject when isTemporaryPassword is false regardless of passwordExpiresAt', async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(
      mockUser({
        isTemporaryPassword: false,
        passwordExpiresAt: new Date(Date.now() - 60 * 1000),
      })
    );
    (comparePassword as jest.Mock).mockResolvedValue(true);

    const res = await request(buildApp())
      .post('/api/users/login')
      .send({ email: 'jane@example.com', password: 'RegularPass123!' });

    expect(res.status).not.toBe(403);
  });
});
