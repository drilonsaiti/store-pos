'use client';

import {useCallback, useSyncExternalStore} from 'react';
import {
    type CurrencyCode,
    formatCurrency,
    SUPPORTED_CURRENCIES,
} from '@/lib/utils/currency';

const STORAGE_KEY = 'store-console:currency';
const CHANGE_EVENT = 'store-console:currency-changed';
const DEFAULT_CURRENCY: CurrencyCode = 'EUR';

function readCurrency(): CurrencyCode {
    if (typeof window === 'undefined') return DEFAULT_CURRENCY;

    const raw = window.localStorage.getItem(STORAGE_KEY);

    return (SUPPORTED_CURRENCIES as readonly string[]).includes(raw ?? '')
        ? (raw as CurrencyCode)
        : DEFAULT_CURRENCY;
}

function subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener('storage', callback);

    return () => {
        window.removeEventListener(CHANGE_EVENT, callback);
        window.removeEventListener('storage', callback);
    };
}

export function useCurrency() {
    const currency = useSyncExternalStore(
        subscribe,
        readCurrency,
        () => DEFAULT_CURRENCY,
    );

    const setCurrency = useCallback((next: CurrencyCode) => {
        window.localStorage.setItem(STORAGE_KEY, next);
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, []);

    return {currency, setCurrency};
}

export function useFormatCurrency() {
    const {currency} = useCurrency();

    return useCallback(
        (value: number) => formatCurrency(value, currency),
        [currency],
    );
}