import { describe, it, expect } from 'vitest';
import { normalizeBarcode, isLikelyBarcode, buildBarcodeIndex, findProductByBarcode } from '../barcode';
import type { Product } from '@/types/product';

const product: Product = {
  id: '1',
  name: 'Milk',
  barCode: '0123456789012',
  price: 1.5,
  purchasePrice: 1,
  quantity: 10,
};

describe('barcode utils', () => {
  it('preserves leading zeroes', () => {
    expect(normalizeBarcode(' 0123456789012 ')).toBe('0123456789012');
  });

  it('detects a plausible numeric barcode', () => {
    expect(isLikelyBarcode('5449000000996')).toBe(true);
    expect(isLikelyBarcode('milk')).toBe(false);
  });

  it('builds an O(1) index and finds an exact match, never coercing to number', () => {
    const index = buildBarcodeIndex([product]);
    expect(findProductByBarcode(index, '0123456789012')?.id).toBe('1');
    expect(findProductByBarcode(index, '123456789012')).toBeUndefined();
  });
});
