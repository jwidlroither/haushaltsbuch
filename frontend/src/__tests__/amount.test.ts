import { describe, it, expect } from 'vitest';

// Test the DE amount parsing logic used in forms
const parseAmount = (raw: string) => parseFloat(raw.replace(',', '.')) || 0;

describe('Amount parsing (DE locale)', () => {
  it('parses comma decimal separator', () => {
    expect(parseAmount('12,50')).toBe(12.5);
  });

  it('parses dot decimal separator', () => {
    expect(parseAmount('12.50')).toBe(12.5);
  });

  it('returns 0 for empty string', () => {
    expect(parseAmount('')).toBe(0);
  });

  it('returns 0 for invalid input', () => {
    expect(parseAmount('abc')).toBe(0);
  });

  it('parses large amounts', () => {
    expect(parseAmount('1250,00')).toBe(1250);
  });
});
