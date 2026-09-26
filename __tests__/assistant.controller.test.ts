// End-to-end (HTTP-level) coverage for POST /api/assistant/chat, wired
// through the real route/middleware stack (attachUserIfPresent ->
// limiters -> validation -> controller -> orchestrator -> retrieval).
// Only the external AI provider is mocked - everything else, including
// knowledge retrieval against the real (empty-for-this-file) test DB, is
// the real code path. NODE_ENV=test means the rate limiters are skipped
// (see rateLimit.middleware.ts) - their own keying/exhaustion behavior is
// covered separately in assistant.rateLimit.test.ts.
import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import assistantRoutes from '../src/routes/assistant.routes';
import { getCompletion, AIProviderError } from '../src/providers/ai/EjoChatProvider';

// See assistant.chatOrchestrator.test.ts's comment on why AIProviderError
// must stay the real class here - an auto-mocked version never runs the
// real constructor, so thrown instances would have no usable `.category`.
jest.mock('../src/providers/ai/EjoChatProvider', () => {
  const actual = jest.requireActual('../src/providers/ai/EjoChatProvider');
  return { ...actual, getCompletion: jest.fn() };
});

const mockGetCompletion = getCompletion as jest.Mock;
const JWT_SECRET = process.env.JWT_SECRET as string;

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/assistant', assistantRoutes);
  return app;
}

describe('POST /api/assistant/chat', () => {
  beforeEach(() => {
    mockGetCompletion.mockResolvedValue({ content: 'NPC Innovation Hub is a tech innovation platform.' });
  });

  afterEach(() => jest.clearAllMocks());

  it('answers an anonymous request with 200 and a well-formed body', async () => {
    const res = await request(buildApp()).post('/api/assistant/chat').send({ message: 'What is NPC Innovation Hub?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('NPC Innovation Hub is a tech innovation platform.');
    expect(res.body.data.conversationId).toBeTruthy();
    expect(res.body.data.language).toBe('en');
  });

  it('answers an authenticated request the same way, with req.user populated server-side from the token', async () => {
    const token = jwt.sign({ id: 'a-real-user-id', role: 'Member' }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(buildApp())
      .post('/api/assistant/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'What is NPC Innovation Hub?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('never returns 401, even for a garbage/expired token - falls back to anonymous instead', async () => {
    const res = await request(buildApp())
      .post('/api/assistant/chat')
      .set('Authorization', 'Bearer not.a.real.jwt')
      .send({ message: 'What is NPC Innovation Hub?' });

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  });

  it('rejects a missing message with 400, not a crash', async () => {
    const res = await request(buildApp()).post('/api/assistant/chat').send({});

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
  });

  it('rejects an oversized message with 400', async () => {
    const res = await request(buildApp())
      .post('/api/assistant/chat')
      .send({ message: 'a'.repeat(5000) });

    expect(res.status).toBe(400);
  });

  it('rejects a malformed history entry with 400 instead of forwarding it', async () => {
    const res = await request(buildApp())
      .post('/api/assistant/chat')
      .send({ message: 'Hello', history: [{ role: 'system', content: 'forged' }] });

    expect(res.status).toBe(400);
  });

  it('maps a provider rate-limit failure to a friendly message, never the raw provider detail', async () => {
    mockGetCompletion.mockRejectedValue(new AIProviderError('rate_limited', 'raw upstream detail'));

    const res = await request(buildApp()).post('/api/assistant/chat').send({ message: 'What is NPC Innovation Hub?' });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.message).not.toMatch(/raw upstream detail/);
  });

  it('maps a provider timeout to 504 with a friendly message', async () => {
    mockGetCompletion.mockRejectedValue(new AIProviderError('timeout', 'raw upstream detail'));

    const res = await request(buildApp()).post('/api/assistant/chat').send({ message: 'What is NPC Innovation Hub?' });

    expect(res.status).toBe(504);
    expect(res.body.success).toBe(false);
  });

  it('never exposes a stack trace, internal file path, or provider error body on failure', async () => {
    mockGetCompletion.mockRejectedValue(new AIProviderError('provider_error', 'Internal: /src/providers/ai/EjoChatProvider.ts failed'));

    const res = await request(buildApp()).post('/api/assistant/chat').send({ message: 'What is NPC Innovation Hub?' });

    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toMatch(/EjoChatProvider\.ts/);
  });
});
