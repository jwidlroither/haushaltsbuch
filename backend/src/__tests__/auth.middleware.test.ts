/**
 * Tests for JWT + API-token authentication middleware
 */
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

jest.mock('../config/database', () => ({ query: jest.fn() }));

// Must happen AFTER setup.ts sets env vars
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const mockedQuery = query as jest.Mock;

function makeReq(authHeader?: string): Partial<Request> {
  return { headers: authHeader ? { authorization: authHeader } : {} } as Partial<Request>;
}

function makeRes(): { status: jest.Mock; json: jest.Mock } {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

const SECRET = process.env.JWT_SECRET!;

describe('authenticate middleware', () => {
  const next: NextFunction = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('rejects request without Authorization header', async () => {
    const req = makeReq() as Request;
    const res = makeRes() as unknown as Response;
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed Authorization header', async () => {
    const req = makeReq('Basic abc123') as Request;
    const res = makeRes() as unknown as Response;
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects expired or invalid token', async () => {
    const req = makeReq('Bearer invalid.token.here') as Request;
    const res = makeRes() as unknown as Response;
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts valid JWT and attaches user to request', async () => {
    const payload = { userId: 'user-123', email: 'test@example.com', name: 'Test User' };
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
    const req = makeReq(`Bearer ${token}`) as Request;
    const res = makeRes() as unknown as Response;

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request).user).toMatchObject(payload);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects expired token', async () => {
    const token = jwt.sign({ userId: 'u1', email: 'a@b.com', name: 'A' }, SECRET, { expiresIn: -1 });
    const req = makeReq(`Bearer ${token}`) as Request;
    const res = makeRes() as unknown as Response;
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid personal API token (64-char hex, no dots) and attaches user', async () => {
    const plainToken = 'a'.repeat(64);
    mockedQuery.mockResolvedValueOnce([
      { user_id: 'user-456', email: 'ios@example.com', name: 'iOS User' },
    ]);
    const req = makeReq(`Bearer ${plainToken}`) as Request;
    const res = makeRes() as unknown as Response;

    await authenticate(req, res, next);

    expect(mockedQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE api_tokens'), [plainToken]);
    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request).user).toMatchObject({ userId: 'user-456', email: 'ios@example.com', name: 'iOS User' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects an unknown API token', async () => {
    mockedQuery.mockResolvedValueOnce([]);
    const req = makeReq(`Bearer ${'b'.repeat(64)}`) as Request;
    const res = makeRes() as unknown as Response;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when the API token lookup throws', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('db down'));
    const req = makeReq(`Bearer ${'c'.repeat(64)}`) as Request;
    const res = makeRes() as unknown as Response;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
