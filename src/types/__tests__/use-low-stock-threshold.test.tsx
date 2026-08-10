// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from 'vitest';
import {act} from 'react';
import {renderHook} from '@testing-library/react';
import {useLowStockThreshold} from '../../hooks/use-low-stock-threshold';

describe('useLowStockThreshold', () => {
    beforeEach(() => window.localStorage.clear());

    it('defaults to 5 when nothing is stored', () => {
        const {result} = renderHook(() => useLowStockThreshold());
        expect(result.current.threshold).toBe(5);
    });

    it('persists a new threshold and reflects it immediately', () => {
        const {result} = renderHook(() => useLowStockThreshold());
        act(() => result.current.setThreshold(10));
        expect(result.current.threshold).toBe(10);
        expect(window.localStorage.getItem('store-console:low-stock-threshold')).toBe('10');
    });

    it('falls back to the default for an invalid value instead of storing garbage', () => {
        const {result} = renderHook(() => useLowStockThreshold());
        act(() => result.current.setThreshold(Number.NaN));
        expect(result.current.threshold).toBe(5);
    });

    it('rounds a fractional threshold to a whole unit count', () => {
        const {result} = renderHook(() => useLowStockThreshold());
        act(() => result.current.setThreshold(7.6));
        expect(result.current.threshold).toBe(8);
    });
});