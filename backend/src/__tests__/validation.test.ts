/**
 * Tests for Zod input validation schemas (no DB / Express needed)
 */
import { z } from 'zod';

// Replicate the schemas from controllers for isolated testing
const TransactionSchema = z.object({
  type:        z.enum(['income', 'expense']),
  amount:      z.number().positive(),
  description: z.string().trim().max(500).optional(),
  category_id: z.string().uuid().optional().nullable(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status:      z.enum(['bezahlt', 'ausstehend']).optional().default('bezahlt'),
});

const CategorySchema = z.object({
  name:  z.string().trim().min(1).max(100),
  icon:  z.string().max(10).default('📦'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  type:  z.enum(['income', 'expense', 'both']).default('both'),
});

describe('TransactionSchema', () => {
  it('accepts valid expense', () => {
    const result = TransactionSchema.safeParse({
      type: 'expense', amount: 42.5, date: '2026-05-01'
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('bezahlt');
  });

  it('rejects negative amount', () => {
    const result = TransactionSchema.safeParse({
      type: 'expense', amount: -10, date: '2026-05-01'
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = TransactionSchema.safeParse({
      type: 'income', amount: 100, date: '01.05.2026'
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = TransactionSchema.safeParse({
      type: 'transfer', amount: 50, date: '2026-05-01'
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from description', () => {
    const result = TransactionSchema.safeParse({
      type: 'expense', amount: 10, date: '2026-05-01',
      description: '  Supermarkt  '
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe('Supermarkt');
  });

  it('accepts ausstehend status', () => {
    const result = TransactionSchema.safeParse({
      type: 'expense', amount: 800, date: '2026-05-01', status: 'ausstehend'
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('ausstehend');
  });
});

describe('CategorySchema', () => {
  it('accepts valid category', () => {
    const result = CategorySchema.safeParse({ name: 'Sport', icon: '🏋️', color: '#8b5cf6', type: 'expense' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid color format', () => {
    const result = CategorySchema.safeParse({ name: 'Test', color: 'red' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = CategorySchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);
  });

  it('applies defaults for missing optional fields', () => {
    const result = CategorySchema.safeParse({ name: 'Neu' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.icon).toBe('📦');
      expect(result.data.type).toBe('both');
    }
  });
});
