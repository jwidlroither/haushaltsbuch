import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const BudgetSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  amount: z.number().positive(),
});

export async function getBudgets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { month, year } = req.query;
    const rows = await query(
      `SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1
         AND ($2::int IS NULL OR b.month = $2)
         AND ($3::int IS NULL OR b.year  = $3)
       ORDER BY b.category_id NULLS FIRST`,
      [userId, month ?? null, year ?? null]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
}

export async function upsertBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data = BudgetSchema.parse(req.body);
    const rows = await query(
      `INSERT INTO budgets (user_id, category_id, month, year, amount)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, month, year, category_id)
         DO UPDATE SET amount = EXCLUDED.amount
       RETURNING *`,
      [userId, data.category_id ?? null, data.month, data.year, data.amount]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function deleteBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const rows = await query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (!rows.length) throw new AppError(404, 'Budget not found');
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getBudgetOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year  as string) : new Date().getFullYear();

    // Gesamtbudget (category_id IS NULL)
    const totalBudgetRows = await query<{ amount: string }>(
      `SELECT amount FROM budgets
       WHERE user_id = $1 AND month = $2 AND year = $3 AND category_id IS NULL`,
      [userId, month, year]
    );
    const totalBudget = totalBudgetRows.length ? parseFloat(totalBudgetRows[0].amount) : 0;

    // Kategorie-Budgets
    const categoryBudgets = await query(
      `SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3 AND b.category_id IS NOT NULL`,
      [userId, month, year]
    );

    // Einnahmen dieses Monats
    const incomeRows = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions
       WHERE user_id=$1 AND type='income'
         AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3`,
      [userId, month, year]
    );
    const totalIncome = parseFloat(incomeRows[0].total);

    // Ausgaben nach Status
    const expenseRows = await query<{ status: string; total: string }>(
      `SELECT status, COALESCE(SUM(amount),0) as total
       FROM transactions
       WHERE user_id=$1 AND type='expense'
         AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
       GROUP BY status`,
      [userId, month, year]
    );
    const paid    = parseFloat(expenseRows.find(r => r.status === 'bezahlt')?.total    ?? '0');
    const pending = parseFloat(expenseRows.find(r => r.status === 'ausstehend')?.total ?? '0');

    // Ausgaben nach Kategorie + Status (für Kategorie-Budget-Vergleich)
    const byCategory = await query(
      `SELECT
         t.category_id,
         c.name as category_name, c.icon as category_icon, c.color as category_color,
         t.status,
         COALESCE(SUM(t.amount),0) as total
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id=$1 AND t.type='expense'
         AND EXTRACT(MONTH FROM t.date)=$2 AND EXTRACT(YEAR FROM t.date)=$3
       GROUP BY t.category_id, c.name, c.icon, c.color, t.status`,
      [userId, month, year]
    );

    // Ausstehende Transaktionen (Liste)
    const pendingTransactions = await query(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id=$1 AND t.type='expense' AND t.status='ausstehend'
         AND EXTRACT(MONTH FROM t.date)=$2 AND EXTRACT(YEAR FROM t.date)=$3
       ORDER BY t.date ASC, t.amount DESC`,
      [userId, month, year]
    );

    // Budget-Basis: Gesamtbudget oder Einnahmen als Fallback
    const budgetBase = totalBudget > 0 ? totalBudget : totalIncome;
    const available  = budgetBase - paid - pending;

    res.json({
      month, year,
      totalBudget,
      totalIncome,
      paid,
      pending,
      available,
      budgetBase,
      usedPercent: budgetBase > 0 ? Math.min(100, Math.round(((paid + pending) / budgetBase) * 100)) : 0,
      paidPercent:    budgetBase > 0 ? Math.min(100, Math.round((paid    / budgetBase) * 100)) : 0,
      pendingPercent: budgetBase > 0 ? Math.min(100, Math.round((pending / budgetBase) * 100)) : 0,
      categoryBudgets,
      byCategory,
      pendingTransactions,
    });
  } catch (err) { next(err); }
}
