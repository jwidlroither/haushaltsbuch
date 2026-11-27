import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { resolveCurrentPeriod, addPeriodPayment } from '../services/periodItems';

const INTERVALS = ['monthly', 'quarterly', 'yearly', 'irregular'] as const;
const CATEGORIES = ['Streaming', 'Software', 'Wertkarte', 'Sonstige'] as const;

const SubscriptionSchema = z.object({
  name:          z.string().trim().min(1).max(200),
  amount:        z.number().positive(),
  interval:      z.enum(INTERVALS),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  category:      z.enum(CATEGORIES).optional().default('Sonstige'),
  active:        z.boolean().optional().default(true),
  note:          z.string().trim().max(1000).nullable().optional(),
});

export async function getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query(
      `SELECT * FROM subscriptions WHERE user_id=$1
       ORDER BY active DESC, next_due_date NULLS LAST, name`,
      [req.user!.userId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
}

export async function createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const d = SubscriptionSchema.parse(req.body);
    const rows = await query(
      `INSERT INTO subscriptions (user_id, name, amount, interval, next_due_date, category, active, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user!.userId, d.name, d.amount, d.interval, d.next_due_date ?? null, d.category, d.active, d.note ?? null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function updateSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id FROM subscriptions WHERE id=$1 AND user_id=$2', [id, req.user!.userId]);
    if (!existing.length) throw new AppError(404, 'Abo nicht gefunden');
    const d = SubscriptionSchema.partial().parse(req.body);
    const entries = Object.entries(d).filter(([, v]) => v !== undefined);
    if (!entries.length) { res.status(400).json({ error: 'No fields to update' }); return; }
    const rows = await query(
      `UPDATE subscriptions SET ${entries.map(([k], i) => `${k}=$${i + 2}`).join(',')} WHERE id=$1 RETURNING *`,
      [id, ...entries.map(([, v]) => v)]
    );
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
}

const AddToPeriodSchema = z.object({ amount: z.number().positive() });

/**
 * Manuelle Variante für 'irregular'-Abos (v.a. Wertkarten): da die nie automatisch
 * in einen Zeitraum übernommen werden (ihr Timing ist per Definition nicht
 * vorhersehbar), trägt man einen Aufladebetrag hier genau dann ein, wenn man
 * ihn tatsächlich bezahlt hat – landet sofort als bezahlt im aktuellen Zeitraum,
 * ohne die Vorlage zu verändern.
 */
export async function addSubscriptionToCurrentPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { amount } = AddToPeriodSchema.parse(req.body);
    const existing = await query('SELECT id FROM subscriptions WHERE id=$1 AND user_id=$2', [id, userId]);
    if (!existing.length) throw new AppError(404, 'Abo nicht gefunden');

    const period = await resolveCurrentPeriod(userId);
    await addPeriodPayment(userId, 'subscription', id, amount, amount, period);
    res.status(201).json({ period });
  } catch (err) { next(err); }
}
