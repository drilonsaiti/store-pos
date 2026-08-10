import {describe, expect, it} from 'vitest';
import {getStockStatus} from '../product';

describe('getStockStatus', () => {
    it('treats zero and negative quantity as out of stock', () => {
        expect(getStockStatus(0)).toBe('out-of-stock');
        expect(getStockStatus(-1)).toBe('out-of-stock');
    });

    it('treats quantity at or below the threshold as low stock', () => {
        expect(getStockStatus(5, 5)).toBe('low-stock');
        expect(getStockStatus(1, 5)).toBe('low-stock');
    });

    it('treats quantity above the threshold as in stock', () => {
        expect(getStockStatus(6, 5)).toBe('in-stock');
    });

    it('respects a custom threshold', () => {
        expect(getStockStatus(10, 20)).toBe('low-stock');
        expect(getStockStatus(25, 20)).toBe('in-stock');
    });
});