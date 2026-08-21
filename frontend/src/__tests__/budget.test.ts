import { describe, it, expect } from 'vitest';

// Pure business logic tests – no React needed
function calcBudget(budgetBase: number, paid: number, pending: number) {
  const available = budgetBase - paid - pending;
  const pct = budgetBase > 0 ? Math.min(100, Math.round(((paid + pending) / budgetBase) * 100)) : 0;
  return { available, usedPercent: pct };
}

describe('Budget calculations', () => {
  it('calculates available correctly', () => {
    const r = calcBudget(2000, 500, 200);
    expect(r.available).toBe(1300);
    expect(r.usedPercent).toBe(35);
  });

  it('caps percent at 100 when overspent', () => {
    const r = calcBudget(1000, 900, 200);
    expect(r.available).toBe(-100);
    expect(r.usedPercent).toBe(100);
  });

  it('returns zero percent with no base', () => {
    const r = calcBudget(0, 0, 0);
    expect(r.usedPercent).toBe(0);
  });
});
