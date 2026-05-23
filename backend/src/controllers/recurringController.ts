import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const Schema = z.object({
  type:         z.enum(['income','expense']),
  amount:       z.number().positive(),
  description:  z.string().trim().max(500).optional(),
  category_id:  z.string().uuid().nullable().optional(),
  interval:     z.enum(['monthly','weekly','yearly','quarterly']).default('monthly'),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  start_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  is_active:    z.boolean().optional().default(true),
});

export async function getRecurring(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query(
      `SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM recurring_transactions r LEFT JOIN categories c ON r.category_id=c.id
       WHERE r.user_id=$1 ORDER BY r.is_active DESC, r.amount DESC`,
      [req.user!.userId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
}

export async function createRecurring(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const d = Schema.parse(req.body);
    const rows = await query(
      `INSERT INTO recurring_transactions
         (user_id,type,amount,description,category_id,interval,day_of_month,start_date,end_date,is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user!.userId,d.type,d.amount,d.description??null,d.category_id??null,
       d.interval,d.day_of_month??null,d.start_date,d.end_date??null,d.is_active]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function updateRecurring(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const ex = await query('SELECT id FROM recurring_transactions WHERE id=$1 AND user_id=$2',[id,req.user!.userId]);
    if (!ex.length) throw new AppError(404,'Not found');
    const d = Schema.partial().parse(req.body);
    const entries = Object.entries(d).filter(([,v])=>v!==undefined);
    if (!entries.length) { res.status(400).json({ error:'No fields' }); return; }
    const rows = await query(
      `UPDATE recurring_transactions SET ${entries.map(([k],i)=>`${k}=$${i+2}`).join(',')} WHERE id=$1 RETURNING *`,
      [id,...entries.map(([,v])=>v)]
    );
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function deleteRecurring(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query('DELETE FROM recurring_transactions WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user!.userId]);
    if (!rows.length) throw new AppError(404,'Not found');
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function toggleRecurring(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query(
      `UPDATE recurring_transactions SET is_active=NOT is_active WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id,req.user!.userId]
    );
    if (!rows.length) throw new AppError(404,'Not found');
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
}

export async function materializeRecurring(userId: string, month: number, year: number): Promise<number> {
  const targetDate = `${year}-${String(month).padStart(2,'0')}-01`;
  const active = await query<{
    id:string; type:string; amount:string; description:string|null; category_id:string|null;
    interval:string; day_of_month:number|null; last_created:string|null;
  }>(
    `SELECT * FROM recurring_transactions WHERE user_id=$1 AND is_active=TRUE
       AND start_date<=$2 AND (end_date IS NULL OR end_date>=$2)`,
    [userId, targetDate]
  );
  let created = 0;
  for (const r of active) {
    if (r.last_created) {
      const lc = new Date(r.last_created);
      if (lc.getFullYear()===year && lc.getMonth()+1===month) continue;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    const day = Math.min(r.day_of_month ?? 1, daysInMonth);
    const txDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    await query(
      `INSERT INTO transactions (user_id,type,amount,description,category_id,date,status) VALUES ($1,$2,$3,$4,$5,$6,'ausstehend')`,
      [userId, r.type, r.amount, r.description, r.category_id, txDate]
    );
    await query(`UPDATE recurring_transactions SET last_created=$1 WHERE id=$2`,[txDate, r.id]);
    created++;
  }
  if (created > 0) logger.info('Materialized recurring', { userId, month, year, created });
  return created;
}

export async function triggerMaterialize(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth()+1;
    const year  = req.query.year  ? parseInt(req.query.year  as string) : new Date().getFullYear();
    const count = await materializeRecurring(req.user!.userId, month, year);
    res.json({ created: count, month, year });
  } catch (err) { next(err); }
}

export async function getUpcomingPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const months = parseInt((req.query.months as string) ?? '3');
    const active = await query<{
      type:string; amount:string; description:string|null; interval:string;
      day_of_month:number|null; end_date:string|null;
      category_name:string|null; category_icon:string|null; category_color:string|null;
    }>(
      `SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM recurring_transactions r LEFT JOIN categories c ON r.category_id=c.id
       WHERE r.user_id=$1 AND r.is_active=TRUE`,
      [req.user!.userId]
    );
    const preview: object[] = [];
    const now = new Date();
    for (let m=0; m<months; m++) {
      const d = new Date(now.getFullYear(), now.getMonth()+m, 1);
      const month = d.getMonth()+1, year = d.getFullYear();
      const daysInMonth = new Date(year, month, 0).getDate();
      for (const r of active) {
        if (r.end_date && new Date(r.end_date) < d) continue;
        const day = Math.min(r.day_of_month ?? 1, daysInMonth);
        preview.push({
          date: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
          type: r.type, amount: parseFloat(r.amount),
          description: r.description, category_name: r.category_name,
          category_icon: r.category_icon, category_color: r.category_color,
        });
      }
    }
    preview.sort((a,b) => (a as {date:string}).date.localeCompare((b as {date:string}).date));
    res.json({ data: preview });
  } catch (err) { next(err); }
}
