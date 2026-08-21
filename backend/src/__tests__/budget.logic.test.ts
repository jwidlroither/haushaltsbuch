/**
 * Unit tests for budget calculation logic
 */

interface BudgetState {
  totalBudget: number;
  totalIncome: number;
  paid: number;
  pending: number;
}

function calcAvailable(state: BudgetState) {
  const base = state.totalBudget > 0 ? state.totalBudget : state.totalIncome;
  return {
    budgetBase: base,
    available:  base - state.paid - state.pending,
    usedPercent: base > 0 ? Math.min(100, Math.round(((state.paid + state.pending) / base) * 100)) : 0,
    paidPercent:    base > 0 ? Math.min(100, Math.round((state.paid    / base) * 100)) : 0,
    pendingPercent: base > 0 ? Math.min(100, Math.round((state.pending / base) * 100)) : 0,
  };
}

describe('Budget calculation', () => {
  it('uses totalBudget as base when set', () => {
    const result = calcAvailable({ totalBudget: 2000, totalIncome: 3000, paid: 500, pending: 200 });
    expect(result.budgetBase).toBe(2000);
    expect(result.available).toBe(1300);
  });

  it('falls back to totalIncome when no budget set', () => {
    const result = calcAvailable({ totalBudget: 0, totalIncome: 2500, paid: 800, pending: 300 });
    expect(result.budgetBase).toBe(2500);
    expect(result.available).toBe(1400);
  });

  it('calculates negative available when overspent', () => {
    const result = calcAvailable({ totalBudget: 1000, totalIncome: 1500, paid: 900, pending: 200 });
    expect(result.available).toBe(-100);
    expect(result.usedPercent).toBe(100); // capped at 100
  });

  it('returns 0 percent when no base', () => {
    const result = calcAvailable({ totalBudget: 0, totalIncome: 0, paid: 0, pending: 0 });
    expect(result.usedPercent).toBe(0);
    expect(result.available).toBe(0);
  });

  it('calculates percentages correctly', () => {
    const result = calcAvailable({ totalBudget: 1000, totalIncome: 0, paid: 400, pending: 100 });
    expect(result.paidPercent).toBe(40);
    expect(result.pendingPercent).toBe(10);
    expect(result.usedPercent).toBe(50);
  });
});
