import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface ApiToken {
  id: string;
  user_id: string;
  token: string;
  name: string | null;
  last_used: string | null;
  created_at: string;
}

const CreateTokenSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

/** Liste aller eigenen API-Tokens (der Token-Wert selbst wird nur bei der Erstellung angezeigt). */
export async function getTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rows = await query<Omit<ApiToken, 'token'>>(
      `SELECT id, user_id, name, last_used, created_at FROM api_tokens
       WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
}

/** Erzeugt einen neuen persönlichen API-Token, z.B. für die iOS-App. */
export async function createToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { name } = CreateTokenSchema.parse(req.body ?? {});
    const token = crypto.randomBytes(32).toString('hex');
    const rows = await query<ApiToken>(
      `INSERT INTO api_tokens (user_id, token, name) VALUES ($1,$2,$3)
       RETURNING id, user_id, token, name, last_used, created_at`,
      [userId, token, name ?? null]
    );
    // Der Klartext-Token wird nur in dieser einen Antwort zurückgegeben – danach nicht mehr abrufbar.
    res.status(201).json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function deleteToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const rows = await query(
      'DELETE FROM api_tokens WHERE id=$1 AND user_id=$2 RETURNING id',
      [id, userId]
    );
    if (!rows.length) throw new AppError(404, 'Token not found');
    res.status(204).send();
  } catch (err) { next(err); }
}
