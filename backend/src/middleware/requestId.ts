import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request { requestId: string; }
  }
}

/** Attach a unique request ID to every request for log tracing. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || crypto.randomBytes(8).toString('hex');
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
