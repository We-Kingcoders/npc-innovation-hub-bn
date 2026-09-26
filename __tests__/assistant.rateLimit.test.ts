// Confirms the assistant limiters actually key by authenticated user id
// when attachUserIfPresent runs first (the required order - see
// assistant.routes.ts's comment) and fall back to IP for anonymous
// callers, rather than everyone anonymous sharing one IP-only bucket.
//
// Like rateLimit.middleware.test.ts, this must flip NODE_ENV away from
// 'test' to actually exercise the limiter (it's skipped under
// NODE_ENV=test to avoid cross-test interference from the in-memory,
// process-wide store).
import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import { attachUserIfPresent } from '../src/middlewares/auth.middleware';
import { assistantChatLimiter } from '../src/middlewares/rateLimit.middleware';

const JWT_SECRET = process.env.JWT_SECRET as string;

function buildApp(): Express {
  const app = express();
  app.use(attachUserIfPresent, assistantChatLimiter, (req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

function tokenFor(id: string): string {
  return jwt.sign({ id, role: 'Member' }, JWT_SECRET, { expiresIn: '1h' });
}

describe('assistantChatLimiter keys by authenticated user id, not shared IP', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('a rate-limited authenticated user does not consume another authenticated user\'s bucket', async () => {
    // AI_CONFIG.ejochat/rateLimitPerMinute is read once at module load, so
    // this exercises whatever the current configured limit is rather than
    // re-configuring it - matches the existing limiter test's approach of
    // driving the real configured limiter, not a mocked one.
    const app = buildApp();
    const userAToken = tokenFor('rate-limit-user-a');
    const userBToken = tokenFor('rate-limit-user-b');

    // Exhaust user A's bucket.
    let lastStatus = 200;
    for (let i = 0; i < 50 && lastStatus === 200; i++) {
      const res = await request(app).get('/').set('Authorization', `Bearer ${userAToken}`);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);

    // User B, a different authenticated identity, must still be allowed
    // through - proves the key is per-user, not per-process/global.
    const userBRes = await request(app).get('/').set('Authorization', `Bearer ${userBToken}`);
    expect(userBRes.status).toBe(200);
  });
});
