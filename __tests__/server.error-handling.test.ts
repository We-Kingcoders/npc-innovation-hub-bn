// Regression coverage for a real gap: this app had no global Express
// error-handling middleware at all. Anything that reached Express's
// error pipeline fell through to Express's own default handler (a bare,
// unstyled response, stack trace leaked outside production) instead of
// this app's usual JSON error shape - and, since this app is on Express
// 5, an async route handler that throws or rejects is auto-forwarded to
// that pipeline by Express itself, with no wrapper needed. Before this
// fix, that meant most uncaught async errors in controllers surfaced as
// unhandled promise rejections at the process level instead
// (index.ts's process.on('unhandledRejection', ...) then killed the
// whole server via process.exit(1) - a single bad request taking down
// every connected user).
import request from 'supertest';
import express, { Express } from 'express';
import { globalErrorHandler } from '../src/server';

function buildApp(): Express {
  const app = express();

  app.get('/throws-sync', () => {
    throw new Error('boom - sync');
  });

  // No try/catch and no manual .catch(next) - Express 5's own async
  // handler support is what's expected to route this into
  // globalErrorHandler, exactly like an unguarded controller would.
  app.get('/rejects-async', async () => {
    await Promise.resolve();
    throw new Error('boom - async');
  });

  app.get('/ok', (req, res) => {
    res.status(200).json({ status: 'success' });
  });

  app.use(globalErrorHandler);
  return app;
}

describe('globalErrorHandler', () => {
  it('does not affect a normal successful request', async () => {
    const res = await request(buildApp()).get('/ok');
    expect(res.status).toBe(200);
  });

  it('turns a synchronously-thrown error into a clean JSON 500', async () => {
    const res = await request(buildApp()).get('/throws-sync');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  });

  it('catches an async handler that rejects, with no manual wrapper', async () => {
    const res = await request(buildApp()).get('/rejects-async');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  });

  it('never leaks the actual error message to the client', async () => {
    const res = await request(buildApp()).get('/rejects-async');

    expect(JSON.stringify(res.body)).not.toContain('boom');
  });
});
