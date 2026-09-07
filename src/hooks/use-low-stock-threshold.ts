'use client';

import {useCallback, useSyncExternalStore} from 'react';
import {DEFAULT_LOW_STOCK_THRESHOLD} from '@/types/product';

const STORAGE_KEY = 'store-console:low-stock-threshold';
const CHANGE_EVENT = 'store-console:low-stock-threshold-changed';

function readThreshold(): number {
    if (typeof window === 'undefined') {
        return DEFAULT_LOW_STOCK_THRESHOLD;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;

    return Number.isFinite(parsed) && parsed >= 0
        ? parsed
        : DEFAULT_LOW_STOCK_THRESHOLD;
}

function subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener('storage', callback);

    return () => {
        window.removeEventListener(CHANGE_EVENT, callback);
        window.removeEventListener('storage', callback);
    };
}

/**
 * Per-catalog low-stock threshold, editable from Settings. Persisted to
 * localStorage (this is store-level configuration, not per-product data, so
 * it doesn't need to live in Firebase) and shared across every tab via a
 * custom event, the same pattern as the offline sale queue.
 */
export function useLowStockThreshold() {
    const threshold = useSyncExternalStore(
        subscribe,
        readThreshold,
        () => DEFAULT_LOW_STOCK_THRESHOLD,
    );

    const setThreshold = useCallback((next: number) => {
        const safe =
            Number.isFinite(next) && next >= 0
                ? Math.round(next)
                : DEFAULT_LOW_STOCK_THRESHOLD;

        window.localStorage.setItem(STORAGE_KEY, String(safe));
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, []);

    return {threshold, setThreshold};
}