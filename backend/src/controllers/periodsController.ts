import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { resolvePeriod, previousPeriod, type Period } from '../utils/period';
import { getUserPayday, adjustDebtRemaining } from '../services/periodItems';

interface PeriodItemRow {
  id: string;
  source_type: 'fixed' | 'debt';
  source_id: string;
  planned_amount: string;
  paid: boolean;
  paid_at: string | null;
  paid_amount: string | null;
  name: string;
  due_day: number | null;
  creditor_type: string | null;
}

function sumSection(items: PeriodItemRow[]) {
  const planned = items.reduce((a, i) => a + parseFloat(i.planned_amount), 0);
  const paid = items
    .filter(i => i.paid)
    .reduce((a, i) => a + (i.paid_amount !== null ? parseFloat(i.paid_amount) : parseFloat(i.planned_amount)), 0);
  return { planned, paid, open: planned - paid };
}

/** Legt für alle aktiven Fixkosten/Rückzahlungen des Nutzers fehlende period_items
 *  für den gegebenen Zeitraum an (idempotent dank UNIQUE-Constraint + DO NOTHING). */
async function materializePeriod(userId: string, periodStart: string): Promise<void> {
  await query(
    `INSERT INTO period_items (user_id, period_start, source_type, source_id, planned_amount)
     SELECT $1, $2, 'fixed', id, amount FROM fixed_costs WHERE user_id=$1 AND active=TRUE
     ON CONFLICT (user_id, period_start, source_type, source_id) DO NOTHING`,
    [userId, periodStart]
  );
  await query(
    `INSERT INTO period_items (user_id, period_start, source_type, source_id, planned_amount)
     SELECT $1, $2, 'debt', id, COALESCE(monthly_rate, 0) FROM debts WHERE user_id=$1 AND active=TRUE
     ON CONFLICT (user_id, period_start, source_type, source_id) DO NOTHING`,
    [userId, periodStart]
  );
}

const DateQuerySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function getCurrentPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { date } = DateQuerySchema.parse(req.query);
    const referenceDate = date ? new Date(`${date}T00:00:00`) : new Date();
    const payday = await getUserPayday(userId);
    const period = resolvePeriod(payday, referenceDate);

    await materializePeriod(userId, period.start);

    const items = await query<PeriodItemRow>(
      `SELECT pi.id, pi.source_type, pi.source_id, pi.planned_amount, pi.paid, pi.paid_at, pi.paid_amount,
              COALESCE(fc.name, d.name) AS name,
              COALESCE(fc.due_day, d.due_day) AS due_day,
              d.creditor_type
       FROM period_items pi
       LEFT JOIN fixed_costs fc ON pi.source_type='fixed' AND pi.source_id=fc.id
       LEFT JOIN debts d        ON pi.source_type='debt'  AND pi.source_id=d.id
       WHERE pi.user_id=$1 AND pi.period_start=$2
       ORDER BY due_day NULLS LAST, name`,
      [userId, period.start]
    );
    const fixedItems = items.filter(i => i.source_type === 'fixed');
    const debtItems = items.filter(i => i.source_type === 'debt');

    const expenseRows = await query(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
       WHERE t.user_id=$1 AND t.type='expense' AND t.date BETWEEN $2 AND $3
       ORDER BY t.date DESC, t.created_at DESC`,
      [userId, period.start, period.end]
    );
    const expenseTotals = await query<{ status: string; total: string }>(
      `SELECT status, COALESCE(SUM(amount),0) as total FROM transactions
       WHERE user_id=$1 AND type='expense' AND date BETWEEN $2 AND $3
       GROUP BY status`,
      [userId, period.start, period.end]
    );
    const expensesPlanned = expenseTotals.reduce((a, r) => a + parseFloat(r.total), 0);
    const expensesPaid = parseFloat(expenseTotals.find(r => r.status === 'bezahlt')?.total ?? '0');

    const incomeRows = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions
       WHERE user_id=$1 AND type='income' AND date BETWEEN $2 AND $3`,
      [userId, period.start, period.end]
    );
    const income = parseFloat(incomeRows[0].total);

    const fixed = sumSection(fixedItems);
    const debts = sumSection(debtItems);
    const expenses = { planned: expensesPlanned, paid: expensesPaid, open: expensesPlanned - expensesPaid };

    const available = income - fixed.planned - debts.planned - expenses.planned;

    res.json({
      period,
      payday,
      income,
      available,
      fixedCosts: { items: fixedItems, ...fixed },
      debts: { items: debtItems, ...debts },
      expenses: { items: expenseRows, ...expenses },
    });
  } catch (err) { next(err); }
}

const PeriodItemUpdateSchema = z.object({
  paid: z.boolean().optional(),
  paid_amount: z.number().min(0).nullable().optional(),
  planned_amount: z.number().min(0).optional(),
});

export async function updatePeriodItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const d = PeriodItemUpdateSchema.parse(req.body);

    const existingRows = await query<{
      source_type: 'fixed' | 'debt'; source_id: string;
      planned_amount: string; paid: boolean; paid_amount: string | null;
    }>(
      'SELECT source_type, source_id, planned_amount, paid, paid_amount FROM period_items WHERE id=$1 AND user_id=$2',
      [id, userId]
    );
    if (!existingRows.length) throw new AppError(404, 'Eintrag nicht gefunden');
    const existing = existingRows[0];

    const newPaid = d.paid ?? existing.paid;
    const newPlanned = d.planned_amount ?? parseFloat(existing.planned_amount);
    const newPaidAmount = d.paid_amount !== undefined ? d.paid_amount : (existing.paid_amount !== null ? parseFloat(existing.paid_amount) : null);

    const oldEffectivePaid = existing.paid ? (existing.paid_amount !== null ? parseFloat(existing.paid_amount) : parseFloat(existing.planned_amount)) : 0;
    const newEffectivePaid = newPaid ? (newPaidAmount !== null ? newPaidAmount : newPlanned) : 0;

    const rows = await query(
      `UPDATE period_items SET paid=$2, planned_amount=$3, paid_amount=$4,
         paid_at = CASE WHEN $2 THEN COALESCE(paid_at, NOW()) ELSE NULL END
       WHERE id=$1 RETURNING *`,
      [id, newPaid, newPlanned, newPaidAmount]
    );

    if (existing.source_type === 'debt' && newEffectivePaid !== oldEffectivePaid) {
      await adjustDebtRemaining(userId, existing.source_id, newEffectivePaid - oldEffectivePaid);
    }

    res.json({ data: rows[0] });
  } catch (err) { next(err); }
}

interface PeriodSummary {
  period: Period;
  income: number;
  available: number;
  fixedCosts: { planned: number; paid: number };
  debts: { planned: number; paid: number };
  expenses: { planned: number; paid: number };
}

/** Liest einen bereits vergangenen Zeitraum nur aus (keine Auto-Materialisierung –
 *  ein Zeitraum zeigt nur, was zu der Zeit tatsächlich als Vorlage existierte). */
async function summarizePeriod(userId: string, period: Period): Promise<PeriodSummary> {
  const itemTotals = await query<{ source_type: string; planned: string; paid: string }>(
    `SELECT source_type,
            COALESCE(SUM(planned_amount), 0) AS planned,
            COALESCE(SUM(CASE WHEN paid THEN COALESCE(paid_amount, planned_amount) ELSE 0 END), 0) AS paid
     FROM period_items
     WHERE user_id=$1 AND period_start=$2
     GROUP BY source_type`,
    [userId, period.start]
  );
  const fixedRow = itemTotals.find(r => r.source_type === 'fixed');
  const debtRow = itemTotals.find(r => r.source_type === 'debt');

  const expenseTotals = await query<{ status: string; total: string }>(
    `SELECT status, COALESCE(SUM(amount),0) as total FROM transactions
     WHERE user_id=$1 AND type='expense' AND date BETWEEN $2 AND $3
     GROUP BY status`,
    [userId, period.start, period.end]
  );
  const expensesPlanned = expenseTotals.reduce((a, r) => a + parseFloat(r.total), 0);
  const expensesPaid = parseFloat(expenseTotals.find(r => r.status === 'bezahlt')?.total ?? '0');

  const incomeRows = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions
     WHERE user_id=$1 AND type='income' AND date BETWEEN $2 AND $3`,
    [userId, period.start, period.end]
  );
  const income = parseFloat(incomeRows[0].total);

  const fixedCosts = { planned: parseFloat(fixedRow?.planned ?? '0'), paid: parseFloat(fixedRow?.paid ?? '0') };
  const debts = { planned: parseFloat(debtRow?.planned ?? '0'), paid: parseFloat(debtRow?.paid ?? '0') };
  const expenses = { planned: expensesPlanned, paid: expensesPaid };
  const available = income - fixedCosts.planned - debts.planned - expenses.planned;

  return { period, income, available, fixedCosts, debts, expenses };
}

const HistoryQuerySchema = z.object({ count: z.coerce.number().int().min(1).max(36).default(12) });

/** Verlauf: die letzten N abgeschlossenen Zeiträume (ohne den laufenden). */
export async function getPeriodHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { count } = HistoryQuerySchema.parse(req.query);
    const payday = await getUserPayday(userId);

    let period = resolvePeriod(payday, new Date());
    const results: PeriodSummary[] = [];
    for (let i = 0; i < count; i++) {
      period = previousPeriod(payday, period);
      results.push(await summarizePeriod(userId, period));
    }

    res.json({ data: results });
  } catch (err) { next(err); }
}
