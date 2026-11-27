import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { resolveCurrentPeriod, addPeriodPayment } from '../services/periodItems';

const CREDITOR_TYPES = ['privat', 'inkasso', 'ratenkauf', 'sonstige'] as const;

const DebtSchema = z.object({
  name:             z.string().trim().min(1).max(200),
  creditor_type:    z.enum(CREDITOR_TYPES),
  monthly_rate:     z.number().min(0).nullable().optional(),
  remaining_amount: z.number().min(0).nullable().optional(),
  due_day:          z.number().int().min(1).max(31).nullable().optional(),
  active:           z.boolean().optional().default(true),
  note:             z.string().trim().max(1000).nullable().optional(),
});

interface DebtRow {
  id: string;
  name: string;
  creditor_type: string;
  monthly_rate: string | null;
  remaining_amount: string | null;
  due_day: number | null;
  active: boolean;
  note: string | null;
  total_paid: string;
}

/** Reichert Schulden um Fortschritt/Prognose an (ohne eigene "Ursprungsbetrag"-Spalte:
 *  Ursprung = aktueller Restbetrag + Summe aller bisher als bezahlt markierten period_items). */
function enrich(row: DebtRow) {
  const monthlyRate = row.monthly_rate !== null ? parseFloat(row.monthly_rate) : null;
  const remaining   = row.remaining_amount !== null ? parseFloat(row.remaining_amount) : null;
  const totalPaid   = parseFloat(row.total_paid) || 0;

  const original = remaining !== null ? remaining + totalPaid : null;
  const progressPercent = original !== null && original > 0
    ? Math.min(100, Math.round((totalPaid / original) * 100))
    : null;

  let monthsRemaining: number | null = null;
  let projectedPayoffDate: string | null = null;
  if (remaining !== null && monthlyRate !== null && monthlyRate > 0) {
    monthsRemaining = Math.ceil(remaining / monthlyRate);
    const payoff = new Date();
    payoff.setMonth(payoff.getMonth() + monthsRemaining);
    projectedPayoffDate = payoff.toISOString().slice(0, 10);
  }

  return {
    id: row.id,
    name: row.name,
    creditor_type: row.creditor_type,
    monthly_rate: monthlyRate,
    remaining_amount: remaining,
    due_day: row.due_day,
    active: row.active,
    note: row.note,
    total_paid: totalPaid,
    progress_percent: progressPercent,
    months_remaining: monthsRemaining,
    projected_payoff_date: projectedPayoffDate,
  };
}

export async function getDebts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query<DebtRow>(
      `SELECT d.*,
         COALESCE((
           SELECT SUM(pi.paid_amount) FROM period_items pi
           WHERE pi.source_type='debt' AND pi.source_id=d.id AND pi.paid=TRUE
         ), 0) AS total_paid
       FROM debts d
       WHERE d.user_id=$1
       ORDER BY d.active DESC, d.creditor_type, d.name`,
      [req.user!.userId]
    );
    res.json({ data: rows.map(enrich) });
  } catch (err) { next(err); }
}

export async function createDebt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const d = DebtSchema.parse(req.body);
    const rows = await query(
      `INSERT INTO debts (user_id, name, creditor_type, monthly_rate, remaining_amount, due_day, active, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user!.userId, d.name, d.creditor_type, d.monthly_rate ?? null, d.remaining_amount ?? null,
       d.due_day ?? null, d.active, d.note ?? null]
    );
    res.status(201).json({ data: enrich({ ...rows[0], total_paid: '0' } as DebtRow) });
  } catch (err) { next(err); }
}

export async function updateDebt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id FROM debts WHERE id=$1 AND user_id=$2', [id, req.user!.userId]);
    if (!existing.length) throw new AppError(404, 'Rückzahlung nicht gefunden');
    const d = DebtSchema.partial().parse(req.body);
    const entries = Object.entries(d).filter(([, v]) => v !== undefined);
    if (!entries.length) { res.status(400).json({ error: 'No fields to update' }); return; }
    const rows = await query(
      `UPDATE debts SET ${entries.map(([k], i) => `${k}=$${i + 2}`).join(',')} WHERE id=$1 RETURNING *`,
      [id, ...entries.map(([, v]) => v)]
    );
    const totalPaidRows = await query<{ total: string }>(
      `SELECT COALESCE(SUM(paid_amount),0) as total FROM period_items WHERE source_type='debt' AND source_id=$1 AND paid=TRUE`,
      [id]
    );
    res.json({ data: enrich({ ...rows[0], total_paid: totalPaidRows[0].total } as DebtRow) });
  } catch (err) { next(err); }
}

export async function deleteDebt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const rows = await query(
      'DELETE FROM debts WHERE id=$1 AND user_id=$2 RETURNING id',
      [id, req.user!.userId]
    );
    if (!rows.length) throw new AppError(404, 'Rückzahlung nicht gefunden');
    await query('DELETE FROM period_items WHERE user_id=$1 AND source_type=$2 AND source_id=$3',
      [req.user!.userId, 'debt', id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

const PaymentSchema = z.object({ amount: z.number().positive() });

/**
 * Sonderzahlung – reduziert den Restbetrag direkt und fließt zusätzlich in
 * `period_items` ein (addiert auf eine eventuell schon bezahlte reguläre Rate
 * des aktuellen Zeitraums), damit die "insgesamt schon gezahlt"-Summe – und
 * damit auch `progress_percent` – über die Zeit konsistent bleibt.
 */
export async function recordDebtPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { amount } = PaymentSchema.parse(req.body);
    const existing = await query<{ remaining_amount: string | null; monthly_rate: string | null }>(
      'SELECT remaining_amount, monthly_rate FROM debts WHERE id=$1 AND user_id=$2', [id, userId]
    );
    if (!existing.length) throw new AppError(404, 'Rückzahlung nicht gefunden');
    if (existing[0].remaining_amount === null) {
      throw new AppError(400, 'Für diese Rückzahlung ist kein Restbetrag hinterlegt');
    }

    const period = await resolveCurrentPeriod(userId);
    const defaultPlanned = existing[0].monthly_rate !== null ? parseFloat(existing[0].monthly_rate) : 0;
    await addPeriodPayment(userId, 'debt', id, amount, defaultPlanned, period);

    const newRemaining = Math.max(0, parseFloat(existing[0].remaining_amount) - amount);
    const rows = await query('UPDATE debts SET remaining_amount=$2 WHERE id=$1 RETURNING *', [id, newRemaining]);
    if (newRemaining <= 0) {
      await query('UPDATE debts SET active=FALSE WHERE id=$1', [id]);
      rows[0].active = false;
    }
    const totalPaidRows = await query<{ total: string }>(
      `SELECT COALESCE(SUM(paid_amount),0) as total FROM period_items WHERE source_type='debt' AND source_id=$1 AND paid=TRUE`,
      [id]
    );
    res.json({ data: enrich({ ...rows[0], total_paid: totalPaidRows[0].total } as DebtRow) });
  } catch (err) { next(err); }
}
