import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const TransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  description: z.string().trim().max(500).optional(),
  category_id: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['bezahlt', 'ausstehend']).optional().default('bezahlt'),
});

export async function getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { month, year, category_id, type, status, limit = '50', offset = '0' } = req.query;

    let where = 'WHERE t.user_id = $1';
    const params: unknown[] = [userId];
    let idx = 2;

    if (month && year) {
      where += ` AND EXTRACT(MONTH FROM t.date)=$${idx++} AND EXTRACT(YEAR FROM t.date)=$${idx++}`;
      params.push(parseInt(month as string), parseInt(year as string));
    }
    if (category_id) { where += ` AND t.category_id=$${idx++}`; params.push(category_id); }
    if (type)        { where += ` AND t.type=$${idx++}`;        params.push(type); }
    if (status)      { where += ` AND t.status=$${idx++}`;      params.push(status); }

    const rows = await query(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
       ${where}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit as string), parseInt(offset as string)]
    );
    const countRows = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM transactions t ${where}`, params
    );
    res.json({ data: rows, total: parseInt(countRows[0].total, 10) });
  } catch (err) { next(err); }
}

export async function createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data = TransactionSchema.parse(req.body);
    // Einnahmen sind immer 'bezahlt'
    const status = data.type === 'income' ? 'bezahlt' : (data.status ?? 'bezahlt');
    const rows = await query(
      `INSERT INTO transactions (user_id, type, amount, description, category_id, date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [userId, data.type, data.amount, data.description ?? null, data.category_id ?? null, data.date, status]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const data = TransactionSchema.partial().parse(req.body);
    const existing = await query('SELECT id FROM transactions WHERE id=$1 AND user_id=$2', [id, userId]);
    if (!existing.length) throw new AppError(404, 'Transaction not found');
    const entries = Object.entries(data).filter(([,v]) => v !== undefined);
    if (!entries.length) { res.status(400).json({ error: 'No fields to update' }); return; }
    const fields = entries.map(([k],i) => `${k}=$${i+2}`);
    const values = entries.map(([,v]) => v);
    const rows = await query(
      `UPDATE transactions SET ${fields.join(',')} WHERE id=$1 RETURNING *`,
      [id, ...values]
    );
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function markAsPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const rows = await query(
      `UPDATE transactions SET status='bezahlt'
       WHERE id=$1 AND user_id=$2 AND type='expense' RETURNING *`,
      [id, userId]
    );
    if (!rows.length) throw new AppError(404, 'Transaction not found');
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const rows = await query(
      'DELETE FROM transactions WHERE id=$1 AND user_id=$2 RETURNING id', [id, userId]
    );
    if (!rows.length) throw new AppError(404, 'Transaction not found');
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year  as string) : new Date().getFullYear();

    const summary = await query<{ type: string; status: string; total: string }>(
      `SELECT type, status, COALESCE(SUM(amount),0) as total
       FROM transactions
       WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
       GROUP BY type, status`,
      [userId, month, year]
    );
    const byCategory = await query(
      `SELECT c.name,c.icon,c.color,t.type,t.status,SUM(t.amount) as total
       FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
       WHERE t.user_id=$1 AND EXTRACT(MONTH FROM t.date)=$2 AND EXTRACT(YEAR FROM t.date)=$3
       GROUP BY c.name,c.icon,c.color,t.type,t.status ORDER BY total DESC`,
      [userId, month, year]
    );
    const monthlyTrend = await query(
      `SELECT EXTRACT(MONTH FROM date) as month, EXTRACT(YEAR FROM date) as year, type, SUM(amount) as total
       FROM transactions WHERE user_id=$1 AND date>=NOW()-INTERVAL '6 months'
       GROUP BY month,year,type ORDER BY year,month`,
      [userId]
    );

    const income  = summary.filter(s => s.type==='income').reduce((a,s)=>a+parseFloat(s.total),0);
    const paid    = summary.filter(s => s.type==='expense'&&s.status==='bezahlt').reduce((a,s)=>a+parseFloat(s.total),0);
    const pending = summary.filter(s => s.type==='expense'&&s.status==='ausstehend').reduce((a,s)=>a+parseFloat(s.total),0);

    res.json({ income, expense: paid+pending, paid, pending, balance: income-paid-pending, byCategory, monthlyTrend });
  } catch (err) { next(err); }
}

export async function getSparkline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const range = (req.query.range as string) || 'month';

    // 7d   → daily   (7 Tage     = wöchentliche Ansicht,   7 Datenpunkte)
    // month→ weekly  (30 Tage    = monatliche Ansicht,   ~4 Datenpunkte)
    // year → monthly (365 Tage   = jährliche Ansicht,    12 Datenpunkte)
    // all  → yearly  (gesamt     = gesamter Zeitraum,     N Datenpunkte)
    const truncUnit: Record<string, string> = { '7d': 'day', 'month': 'week', 'year': 'month', 'all': 'year' };
    const days:      Record<string, number> = { '7d': 7,     'month': 30,     'year': 365,     'all': 0 };

    const trunc = truncUnit[range] ?? 'day';
    const d     = days[range]     ?? 30;

    const rows = await query<{ period: string; income: string; expense: string }>(
      `SELECT
         date_trunc($1, date)::date::text AS period,
         COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE user_id=$2
         AND ($3::int = 0 OR date >= CURRENT_DATE - make_interval(days => $3::int))
       GROUP BY 1
       ORDER BY 1 ASC`,
      [trunc, userId, d]
    );

    res.json({
      data: rows.map(r => ({
        period:  r.period,
        income:  parseFloat(r.income),
        expense: parseFloat(r.expense),
        balance: parseFloat(r.income) - parseFloat(r.expense),
      })),
    });
  } catch (err) { next(err); }
}
