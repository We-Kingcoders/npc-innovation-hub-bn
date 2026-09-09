import request from 'supertest';
import express, { Express } from 'express';
import { authGuessLimiter, emailSendLimiter, signupLimiter } from '../src/middlewares/rateLimit.middleware';

// These limiters are skipped whenever NODE_ENV === 'test' (see the
// middleware's own comment - the store is in-memory and shared process-
// wide, so leaving them active here would let one test's requests count
// against another's limit). That's exactly what needs to be temporarily
// undone to actually exercise the limiting behavior itself.
function buildApp(limiter: express.RequestHandler): Express {
  const app = express();
  app.get('/limited', limiter, (req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe('rate limiters', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('is skipped under NODE_ENV=test, so it never blocks the test suite itself', async () => {
    // Sanity check of the skip behavior every other backend test actually
    // relies on: still NODE_ENV=test here (unlike the other cases below).
    expect(process.env.NODE_ENV).toBe('test');
    const app = buildApp(authGuessLimiter);

    for (let i = 0; i < 15; i++) {
      const res = await request(app).get('/limited');
      expect(res.status).toBe(200);
    }
  });

  it('blocks further requests once the auth-guess limit is exceeded', async () => {
    process.env.NODE_ENV = 'development';
    const app = buildApp(authGuessLimiter);

    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/limited');
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).get('/limited');
    expect(blocked.status).toBe(429);
    expect((blocked.body as { message: string }).message).toMatch(/too many/i);
  });

  it('blocks further requests once the email-send limit is exceeded', async () => {
    process.env.NODE_ENV = 'development';
    const app = buildApp(emailSendLimiter);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/limited');
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).get('/limited');
    expect(blocked.status).toBe(429);
  });

  it('blocks further requests once the signup limit is exceeded', async () => {
    process.env.NODE_ENV = 'development';
    const app = buildApp(signupLimiter);

    for (let i = 0; i < 20; i++) {
      const res = await request(app).get('/limited');
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).get('/limited');
    expect(blocked.status).toBe(429);
  });
});
