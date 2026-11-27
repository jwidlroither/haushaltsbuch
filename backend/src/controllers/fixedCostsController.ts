import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const FixedCostSchema = z.object({
  name:    z.string().trim().min(1).max(200),
  amount:  z.number().positive(),
  due_day: z.number().int().min(1).max(31).nullable().optional(),
  active:  z.boolean().optional().default(true),
  note:    z.string().trim().max(1000).nullable().optional(),
});

export async function getFixedCosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query(
      `SELECT * FROM fixed_costs WHERE user_id=$1 ORDER BY active DESC, due_day NULLS LAST, name`,
      [req.user!.userId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
}

export async function createFixedCost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const d = FixedCostSchema.parse(req.body);
    const rows = await query(
      `INSERT INTO fixed_costs (user_id, name, amount, due_day, active, note)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user!.userId, d.name, d.amount, d.due_day ?? null, d.active, d.note ?? null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function updateFixedCost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id FROM fixed_costs WHERE id=$1 AND user_id=$2', [id, req.user!.userId]);
    if (!existing.length) throw new AppError(404, 'Fixkosten-Eintrag nicht gefunden');
    const d = FixedCostSchema.partial().parse(req.body);
    const entries = Object.entries(d).filter(([, v]) => v !== undefined);
    if (!entries.length) { res.status(400).json({ error: 'No fields to update' }); return; }
    const rows = await query(
      `UPDATE fixed_costs SET ${entries.map(([k], i) => `${k}=$${i + 2}`).join(',')} WHERE id=$1 RETURNING *`,
      [id, ...entries.map(([, v]) => v)]
    );
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function deleteFixedCost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const rows = await query(
      'DELETE FROM fixed_costs WHERE id=$1 AND user_id=$2 RETURNING id',
      [id, req.user!.userId]
    );
    if (!rows.length) throw new AppError(404, 'Fixkosten-Eintrag nicht gefunden');
    // period_items dieser Quelle haben kein DB-Level-FK (polymorphe Quelle) – hier aufräumen.
    await query('DELETE FROM period_items WHERE user_id=$1 AND source_type=$2 AND source_id=$3',
      [req.user!.userId, 'fixed', id]);
    res.status(204).send();
  } catch (err) { next(err); }
}
