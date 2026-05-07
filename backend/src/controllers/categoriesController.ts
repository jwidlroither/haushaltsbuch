import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const CategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(10).default('📦'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  type: z.enum(['income', 'expense', 'both']).default('both'),
});

export async function getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const categories = await query(
      `SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC`,
      [userId]
    );
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data = CategorySchema.parse(req.body);

    const result = await query(
      `INSERT INTO categories (user_id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, data.name, data.icon, data.color, data.type]
    );

    res.status(201).json({ data: result[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const data = CategorySchema.partial().parse(req.body);

    const existing = await query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (!existing.length) throw new AppError(404, 'Category not found');

    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k], i) => `${k} = $${i + 2}`);

    const values = Object.values(data).filter((v) => v !== undefined);
    const result = await query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    res.json({ data: result[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_system = FALSE RETURNING id',
      [id, userId]
    );

    if (!result.length) throw new AppError(404, 'Category not found or cannot be deleted');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
