import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const TransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  description: z.string().max(500).optional(),
  category_id: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { month, year, category_id, type, limit = '50', offset = '0' } = req.query;

    let whereClause = 'WHERE t.user_id = $1';
    const params: unknown[] = [userId];
    let idx = 2;

    if (month && year) {
      whereClause += ` AND EXTRACT(MONTH FROM t.date) = $${idx++} AND EXTRACT(YEAR FROM t.date) = $${idx++}`;
      params.push(parseInt(month as string), parseInt(year as string));
    }
    if (category_id) {
      whereClause += ` AND t.category_id = $${idx++}`;
      params.push(category_id);
    }
    if (type) {
      whereClause += ` AND t.type = $${idx++}`;
      params.push(type);
    }

    const transactions = await query(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       ${whereClause}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit as string), parseInt(offset as string)]
    );

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      params
    );

    res.json({
      data: transactions,
      total: parseInt(countResult[0].total, 10),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (err) {
    next(err);
  }
}

export async function createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data = TransactionSchema.parse(req.body);

    const result = await query(
      `INSERT INTO transactions (user_id, type, amount, description, category_id, date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, data.type, data.amount, data.description || null, data.category_id || null, data.date]
    );

    res.status(201).json({ data: result[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const data = TransactionSchema.partial().parse(req.body);

    const existing = await query('SELECT id FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!existing.length) throw new AppError(404, 'Transaction not found');

    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k], i) => `${k} = $${i + 2}`);

    if (!fields.length) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const values = Object.values(data).filter((v) => v !== undefined);
    const result = await query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    res.json({ data: result[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (!result.length) throw new AppError(404, 'Transaction not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { month, year } = req.query;

    const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

    const summary = await query<{ type: string; total: string }>(
      `SELECT type, SUM(amount) as total
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3
       GROUP BY type`,
      [userId, currentMonth, currentYear]
    );

    const byCategory = await query(
      `SELECT c.name, c.icon, c.color, t.type, SUM(t.amount) as total
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
         AND EXTRACT(MONTH FROM t.date) = $2
         AND EXTRACT(YEAR FROM t.date) = $3
       GROUP BY c.name, c.icon, c.color, t.type
       ORDER BY total DESC`,
      [userId, currentMonth, currentYear]
    );

    const monthlyTrend = await query(
      `SELECT 
         EXTRACT(MONTH FROM date) as month,
         EXTRACT(YEAR FROM date) as year,
         type,
         SUM(amount) as total
       FROM transactions
       WHERE user_id = $1
         AND date >= NOW() - INTERVAL '6 months'
       GROUP BY month, year, type
       ORDER BY year, month`,
      [userId]
    );

    const income = summary.find((s) => s.type === 'income');
    const expense = summary.find((s) => s.type === 'expense');

    res.json({
      income: parseFloat(income?.total || '0'),
      expense: parseFloat(expense?.total || '0'),
      balance: parseFloat(income?.total || '0') - parseFloat(expense?.total || '0'),
      byCategory,
      monthlyTrend,
    });
  } catch (err) {
    next(err);
  }
}
