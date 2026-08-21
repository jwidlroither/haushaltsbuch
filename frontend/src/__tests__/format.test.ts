import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, currentMonth } from '../utils/format';

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1.234,56');
    expect(result).toContain('€');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0,00');
  });

  it('formats large amounts', () => {
    const result = formatCurrency(10000);
    expect(result).toContain('10.000,00');
  });

  it('shows + sign when requested', () => {
    const result = formatCurrency(50, true);
    expect(result).toMatch(/^\+/);
  });
});

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2026-05-15');
    expect(result).toContain('15');
    expect(result).toContain('Mai');
    expect(result).toContain('2026');
  });

  it('handles invalid date gracefully', () => {
    const result = formatDate('invalid');
    expect(result).toBe('invalid');
  });
});

describe('currentMonth', () => {
  it('returns current month and year', () => {
    const { month, year } = currentMonth();
    const now = new Date();
    expect(month).toBe(now.getMonth() + 1);
    expect(year).toBe(now.getFullYear());
  });
});
