'use client';

import {useCallback, useSyncExternalStore} from 'react';
import {ScannerEngineId} from '@/types/scanner';

const STORAGE_KEY = 'store-console:scanner-engine';
const DEFAULT_ENGINE: ScannerEngineId = 'auto';

function readEngine(): ScannerEngineId {
    if (typeof window === 'undefined') return DEFAULT_ENGINE;

    const raw = window.localStorage.getItem(STORAGE_KEY);

    return raw === 'native' ||
        raw === 'zxing' ||
        raw === 'zbar' ||
        raw === 'auto'
        ? raw
        : DEFAULT_ENGINE;
}

function subscribe(callback: () => void) {
    window.addEventListener(
        'store-console:scanner-engine-changed',
        callback,
    );
    window.addEventListener('storage', callback);

    return () => {
        window.removeEventListener(
            'store-console:scanner-engine-changed',
            callback,
        );
        window.removeEventListener('storage', callback);
    };
}

export function useScannerEnginePreference() {
    const engine = useSyncExternalStore(
        subscribe,
        readEngine,
        () => DEFAULT_ENGINE,
    );

    const setEngine = useCallback((nextEngine: ScannerEngineId) => {
        window.localStorage.setItem(STORAGE_KEY, nextEngine);

        window.dispatchEvent(
            new Event('store-console:scanner-engine-changed'),
        );
    }, []);

    return {engine, setEngine};
}