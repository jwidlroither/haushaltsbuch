import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// JWTs aus dem OIDC-Login sind immer signiert und haben zwei Punkte (header.payload.signature).
// Persönliche API-Tokens (Aufgabe 4.1) sind ein einzelner 64-Zeichen-Hex-String ohne Punkte.
function looksLikeJwt(token: string): boolean {
  return token.split('.').length === 3;
}

async function authenticateApiToken(token: string): Promise<JwtPayload | null> {
  const rows = await query<{ user_id: string; email: string; name: string | null }>(
    `UPDATE api_tokens SET last_used = NOW()
     WHERE token = $1
     RETURNING user_id,
       (SELECT email FROM users WHERE id = user_id) AS email,
       (SELECT name  FROM users WHERE id = user_id) AS name`,
    [token]
  );
  if (!rows.length) return null;
  const row = rows[0];
  return { userId: row.user_id, email: row.email, name: row.name ?? row.email };
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  if (looksLikeJwt(token)) {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = payload;
      next();
    } catch (err) {
      logger.warn('Invalid JWT token', { error: (err as Error).message });
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
    return;
  }

  try {
    const user = await authenticateApiToken(token);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    logger.error('API token lookup failed', { error: (err as Error).message });
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}
