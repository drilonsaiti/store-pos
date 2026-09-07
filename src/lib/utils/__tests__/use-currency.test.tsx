// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { renderHook } from '@testing-library/react';
import {useCurrency, useFormatCurrency} from "../../../hooks/use-currency";

describe('useCurrency', () => {
    beforeEach(() => window.localStorage.clear());

    it('defaults to EUR when nothing is stored', () => {
        const { result } = renderHook(() => useCurrency());
        expect(result.current.currency).toBe('EUR');
    });

    it('persists a new currency and reflects it immediately', () => {
        const { result } = renderHook(() => useCurrency());
        act(() => result.current.setCurrency('USD'));
        expect(result.current.currency).toBe('USD');
        expect(window.localStorage.getItem('store-console:currency')).toBe('USD');
    });

    it('falls back to EUR for an unrecognized stored value', () => {
        window.localStorage.setItem('store-console:currency', 'NOT_A_CURRENCY');
        const { result } = renderHook(() => useCurrency());
        expect(result.current.currency).toBe('EUR');
    });
});

describe('useFormatCurrency', () => {
    beforeEach(() => window.localStorage.clear());

    it('reflects a currency change made from a separate hook instance', () => {
        const { result: currencyResult } = renderHook(() => useCurrency());
        const { result: formatResult } = renderHook(() => useFormatCurrency());
        act(() => currencyResult.current.setCurrency('USD'));
        expect(formatResult.current(10)).toContain('10.00');
    });
});