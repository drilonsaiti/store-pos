'use client';

import {useCallback, useEffect, useState} from 'react';
import {type CurrencyCode, formatCurrency, SUPPORTED_CURRENCIES} from '@/lib/utils/currency';

const STORAGE_KEY = 'store-console:currency';
const DEFAULT_CURRENCY: CurrencyCode = 'EUR';

function readCurrency(): CurrencyCode {
    if (typeof window === 'undefined') return DEFAULT_CURRENCY;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return (SUPPORTED_CURRENCIES as readonly string[]).includes(raw ?? '') ? (raw as CurrencyCode) : DEFAULT_CURRENCY;
}

/** Store-wide currency setting, editable from Settings, shared across tabs. */
export function useCurrency() {
    const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

    useEffect(() => {
        setCurrencyState(readCurrency());
        const onChange = () => setCurrencyState(readCurrency());
        window.addEventListener('store-console:currency-changed', onChange);
        return () => window.removeEventListener('store-console:currency-changed', onChange);
    }, []);

    const setCurrency = useCallback((next: CurrencyCode) => {
        window.localStorage.setItem(STORAGE_KEY, next);
        window.dispatchEvent(new Event('store-console:currency-changed'));
        setCurrencyState(next);
    }, []);

    return {currency, setCurrency};
}

/** Returns a formatter bound to the current currency setting — prefer this
 * in components over calling formatCurrency() directly, so displayed
 * amounts follow whatever currency was chosen in Settings. */
export function useFormatCurrency() {
    const {currency} = useCurrency();
    return useCallback((value: number) => formatCurrency(value, currency), [currency]);
}