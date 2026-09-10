// Regression coverage for a real bug: POST /api/users/send-otp (the
// "Resend OTP" endpoint, used by the frontend's OTP verification page)
// registered sendOTP as its last piece of route middleware. sendOTP calls
// next() on success rather than sending a response itself - it expects
// whatever comes after it in the chain to do that, which is exactly what
// user.controller.ts's login flow provides via its own inline callback.
// The standalone route had nothing after sendOTP, so on every successful
// send, next() ran with no more middleware left and the request just hung
// until the client's own timeout - it never got a response at all. Fixed
// via resendOTP, which wraps sendOTP with the same "respond after next()"
// pattern login already uses.
//
// The app under test wires the route directly from otp.middleware.ts
// rather than importing src/routes/user.route.ts, matching the existing
// convention in user.loginPasswordExpiry.test.ts - that file has a
// pre-existing, unrelated TS error on its google-auth route that trips
// ts-jest when the whole router module is loaded.
import request from 'supertest';
import express, { Express } from 'express';
import { resendOTP } from '../src/middlewares/otp.middleware';
import User from '../src/models/user.model';
import { sendEmail } from '../src/utils/email.utils';

jest.mock('../src/models/user.model');
jest.mock('../src/utils/email.utils', () => ({
  sendEmail: jest.fn(),
}));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.post('/api/users/send-otp', resendOTP);
  return app;
}

afterEach(() => jest.clearAllMocks());

describe('POST /api/users/send-otp', () => {
  it('actually responds on success, instead of hanging with no response', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({
      id: 'a1111111-1111-4111-8111-111111111111',
      firstName: 'Jane',
      email: 'jane@example.com',
      role: 'Member',
    });
    (sendEmail as jest.Mock).mockResolvedValue(undefined);

    const res = await request(buildApp())
      .post('/api/users/send-otp')
      .send({ email: 'jane@example.com' });

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(
      'jane@example.com',
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(buildApp()).post('/api/users/send-otp').send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for an email with no matching user', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/users/send-otp')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(404);
  });

  it('returns 500 (still a real response, not a hang) if the email fails to send', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({
      id: 'a1111111-1111-4111-8111-111111111111',
      firstName: 'Jane',
      email: 'jane@example.com',
      role: 'Member',
    });
    (sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP down'));

    const res = await request(buildApp())
      .post('/api/users/send-otp')
      .send({ email: 'jane@example.com' });

    expect(res.status).toBe(500);
  });
});
