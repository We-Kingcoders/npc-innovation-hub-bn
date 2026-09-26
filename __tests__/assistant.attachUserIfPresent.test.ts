// attachUserIfPresent must NEVER 401 on any path - the frontend's shared
// axios client (src/api/client.ts) treats ANY 401 from ANY endpoint as
// "clear the token and hard-redirect to /login". A bug here would
// silently log a real user out just for typing into the chat widget with
// a stale token. This is the single most safety-critical behavior of the
// whole assistant feature, so it gets its own direct, focused test file.
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { attachUserIfPresent } from '../src/middlewares/auth.middleware';
import { addToBlacklist, clearBlacklist } from '../src/utils/tokenBlacklist';

const JWT_SECRET = process.env.JWT_SECRET as string;

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

describe('attachUserIfPresent never rejects the request - only ever attaches or omits req.user', () => {
  afterEach(() => {
    clearBlacklist();
    jest.clearAllMocks();
  });

  it('proceeds anonymously with no Authorization header at all', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    attachUserIfPresent(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('attaches req.user for a real, valid token', () => {
    const token = jwt.sign({ id: 'user-1', role: 'Member' }, JWT_SECRET, { expiresIn: '1h' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    attachUserIfPresent(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 'user-1', role: 'Member' });
  });

  it('proceeds anonymously (never 401s) for a malformed Authorization header', () => {
    const req = mockReq({ authorization: 'NotBearer garbage' });
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    attachUserIfPresent(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('proceeds anonymously (never 401s) for an expired token', () => {
    const expiredToken = jwt.sign({ id: 'user-1', role: 'Member' }, JWT_SECRET, { expiresIn: -10 });
    const req = mockReq({ authorization: `Bearer ${expiredToken}` });
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    attachUserIfPresent(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('proceeds anonymously (never 401s) for a garbage/unparseable token', () => {
    const req = mockReq({ authorization: 'Bearer not.a.real.jwt' });
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    attachUserIfPresent(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('proceeds anonymously (never 401s) for a token signed with a different secret', () => {
    const forgedToken = jwt.sign({ id: 'attacker', role: 'Admin' }, 'wrong-secret', { expiresIn: '1h' });
    const req = mockReq({ authorization: `Bearer ${forgedToken}` });
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    attachUserIfPresent(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('proceeds anonymously (never 401s) for a real but blacklisted (logged-out) token', () => {
    const token = jwt.sign({ id: 'user-1', role: 'Member' }, JWT_SECRET, { expiresIn: '1h' });
    addToBlacklist(token, 3600);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    attachUserIfPresent(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
});
