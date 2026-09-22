// Regression coverage for a fail-open bug: JWT_CONSTANTS.SECRET_KEY
// falls back to "" when JWT_SECRET is unset (variable.utils.ts), and
// verifyTokenMiddleware used to pass that straight to jwt.verify() with
// no guard - jwt.verify(token, "") accepts any token forged with an
// empty-string secret (trivially guessable), instead of failing
// outright. auth.middleware.ts's protectRoute already fails closed the
// same way for every other authenticated route; this one (used for
// /verify-email) didn't have the same guard.
//
// variable.utils.ts is mocked here specifically because it captures
// process.env.JWT_SECRET into a plain constant at module load time -
// there's no way to simulate "JWT_SECRET was never set" by mutating
// process.env after the fact, since the module already read it once.
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const REAL_SECRET = 'a-real-test-secret';

// jsonwebtoken's own jwt.sign() refuses an empty-string secret outright
// ("secretOrPrivateKey must have a value"), so this hand-crafts the raw
// HS256 JWT bytes instead - exactly what an attacker would do with any
// other JWT library/tool that doesn't share that same guard, to prove
// what verifyTokenMiddleware's own explicit check (not jsonwebtoken's)
// is responsible for rejecting.
function forgeTokenWithEmptySecret(payload: object): string {
  const b64url = (buf: Buffer) =>
    buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${header}.${body}`;
  const signature = b64url(crypto.createHmac('sha256', '').update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('verifyTokenMiddleware - fails closed when JWT_SECRET is unset', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns 500 instead of verifying against an empty-string secret', async () => {
    jest.doMock('../src/utils/variable.utils', () => ({
      USER_MESSAGES: {
        INVALID_TOKEN: 'Invalid token',
        INTERNAL_SERVER_ERROR: 'Internal server error',
      },
      JWT_CONSTANTS: { SECRET_KEY: '' },
    }));

    const { verifyTokenMiddleware } = await import(
      '../src/middlewares/verifyToken.middleware'
    );

    // A token an attacker could trivially forge themselves, signed with
    // the same empty string the unset-env fallback used to produce.
    const forgedToken = forgeTokenWithEmptySecret({ id: 'attacker' });

    const req = {
      query: { token: forgedToken },
      headers: {},
      body: {},
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    verifyTokenMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('still verifies a real token normally when JWT_SECRET is actually set', async () => {
    jest.doMock('../src/utils/variable.utils', () => ({
      USER_MESSAGES: {
        INVALID_TOKEN: 'Invalid token',
        INTERNAL_SERVER_ERROR: 'Internal server error',
      },
      JWT_CONSTANTS: { SECRET_KEY: REAL_SECRET },
    }));

    const { verifyTokenMiddleware } = await import(
      '../src/middlewares/verifyToken.middleware'
    );

    const validToken = jwt.sign({ id: 'real-user' }, REAL_SECRET);

    const req = {
      query: { token: validToken },
      headers: {},
      body: {},
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    verifyTokenMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
