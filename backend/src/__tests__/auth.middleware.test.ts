/**
 * Tests for JWT authentication middleware
 */
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Must happen AFTER setup.ts sets env vars
import { authenticate } from '../middleware/auth';

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

  it('rejects request without Authorization header', () => {
    const req = makeReq() as Request;
    const res = makeRes() as unknown as Response;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed Authorization header', () => {
    const req = makeReq('Basic abc123') as Request;
    const res = makeRes() as unknown as Response;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects expired or invalid token', () => {
    const req = makeReq('Bearer invalid.token.here') as Request;
    const res = makeRes() as unknown as Response;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts valid JWT and attaches user to request', () => {
    const payload = { userId: 'user-123', email: 'test@example.com', name: 'Test User' };
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
    const req = makeReq(`Bearer ${token}`) as Request;
    const res = makeRes() as unknown as Response;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request).user).toMatchObject(payload);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects expired token', () => {
    const token = jwt.sign({ userId: 'u1', email: 'a@b.com', name: 'A' }, SECRET, { expiresIn: -1 });
    const req = makeReq(`Bearer ${token}`) as Request;
    const res = makeRes() as unknown as Response;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
