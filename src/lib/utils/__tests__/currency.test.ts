import { describe, it, expect } from 'vitest';
import { calculateLineTotal, calculateCartTotal, formatCurrency } from '../currency';

describe('currency utils', () => {
  it('calculates line totals without float drift', () => {
    expect(calculateLineTotal(0.1, 3)).toBeCloseTo(0.3, 10);
  });

  it('sums a cart using integer-cent arithmetic', () => {
    const total = calculateCartTotal([
      { price: 1.1, quantity: 3 },
      { price: 2.2, quantity: 2 },
    ]);
    expect(total).toBeCloseTo(7.7, 10);
  });

  it('formats EUR currency', () => {
    expect(formatCurrency(1250.5)).toContain('1,250.50');
  });
});
