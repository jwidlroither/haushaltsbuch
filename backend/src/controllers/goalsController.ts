import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const GoalSchema = z.object({
  name:           z.string().trim().min(1).max(200),
  icon:           z.string().max(10).default('🎯'),
  color:          z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  target_amount:  z.number().positive(),
  current_amount: z.number().min(0).optional().default(0),
  deadline:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes:          z.string().trim().max(500).nullable().optional(),
});

const DepositSchema = z.object({ amount: z.number().positive() });

export async function getGoals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query(
      `SELECT *,
         ROUND((current_amount / NULLIF(target_amount,0)) * 100) as progress_percent,
         CASE WHEN deadline IS NOT NULL THEN
           GREATEST(0, EXTRACT(DAY FROM deadline::timestamp - NOW()))
         END as days_remaining
       FROM savings_goals WHERE user_id=$1 ORDER BY is_completed ASC, created_at DESC`,
      [req.user!.userId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
}

export async function createGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const d = GoalSchema.parse(req.body);
    const rows = await query(
      `INSERT INTO savings_goals (user_id,name,icon,color,target_amount,current_amount,deadline,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user!.userId, d.name, d.icon, d.color, d.target_amount,
       d.current_amount ?? 0, d.deadline ?? null, d.notes ?? null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function updateGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const ex = await query('SELECT id FROM savings_goals WHERE id=$1 AND user_id=$2',[id,req.user!.userId]);
    if (!ex.length) throw new AppError(404,'Goal not found');
    const d = GoalSchema.partial().parse(req.body);
    const entries = Object.entries(d).filter(([,v])=>v!==undefined);
    if (!entries.length) { res.status(400).json({ error:'No fields' }); return; }
    const rows = await query(
      `UPDATE savings_goals SET ${entries.map(([k],i)=>`${k}=$${i+2}`).join(',')} WHERE id=$1 RETURNING *`,
      [id,...entries.map(([,v])=>v)]
    );
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function deleteGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query('DELETE FROM savings_goals WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user!.userId]);
    if (!rows.length) throw new AppError(404,'Goal not found');
    res.status(204).send();
  } catch (err) { next(err); }
}

/** Einzahlung auf ein Ziel – atomare SQL-Operation verhindert Race Conditions */
export async function depositToGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { amount } = DepositSchema.parse(req.body);
    const rows = await query<{ is_completed: boolean }>(
      `UPDATE savings_goals
       SET current_amount = LEAST(current_amount + $1, target_amount),
           is_completed   = LEAST(current_amount + $1, target_amount) >= target_amount
       WHERE id=$2 AND user_id=$3
       RETURNING *`,
      [amount, id, req.user!.userId]
    );
    if (!rows.length) throw new AppError(404, 'Goal not found');
    res.json({ data: rows[0], completed: rows[0].is_completed });
  } catch (err) { next(err); }
}
