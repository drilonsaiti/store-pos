'use client';

import {useCallback, useEffect, useState} from 'react';
import {DEFAULT_LOW_STOCK_THRESHOLD} from '@/types/product';

const STORAGE_KEY = 'store-console:low-stock-threshold';

function readThreshold(): number {
    if (typeof window === 'undefined') return DEFAULT_LOW_STOCK_THRESHOLD;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LOW_STOCK_THRESHOLD;
}

/**
 * Per-catalog low-stock threshold, editable from Settings. Persisted to
 * localStorage (this is store-level configuration, not per-product data, so
 * it doesn't need to live in Firebase) and shared across every tab via a
 * custom event, the same pattern as the offline sale queue.
 */
export function useLowStockThreshold() {
    const [threshold, setThresholdState] = useState(DEFAULT_LOW_STOCK_THRESHOLD);

    useEffect(() => {
        setThresholdState(readThreshold());
        const onChange = () => setThresholdState(readThreshold());
        window.addEventListener('store-console:low-stock-threshold-changed', onChange);
        return () => window.removeEventListener('store-console:low-stock-threshold-changed', onChange);
    }, []);

    const setThreshold = useCallback((next: number) => {
        const safe = Number.isFinite(next) && next >= 0 ? Math.round(next) : DEFAULT_LOW_STOCK_THRESHOLD;
        window.localStorage.setItem(STORAGE_KEY, String(safe));
        window.dispatchEvent(new Event('store-console:low-stock-threshold-changed'));
        setThresholdState(safe);
    }, []);

    return {threshold, setThreshold};
}