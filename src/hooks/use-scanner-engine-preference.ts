'use client';

import { useCallback, useEffect, useState } from 'react';
import {ScannerEngineId} from "@/types/scanner";

const STORAGE_KEY = 'store-console:scanner-engine';
const DEFAULT_ENGINE: ScannerEngineId = 'auto';

function readEngine(): ScannerEngineId {
    if (typeof window === 'undefined') return DEFAULT_ENGINE;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'native' || raw === 'zxing' || raw === 'zbar' || raw === 'auto' ? raw : DEFAULT_ENGINE;
}

export function useScannerEnginePreference() {
    const [engine, setEngineState] = useState<ScannerEngineId>(DEFAULT_ENGINE);

    useEffect(() => {
        setEngineState(readEngine());
        const onChange = () => setEngineState(readEngine());
        window.addEventListener('store-console:scanner-engine-changed', onChange);
        return () => window.removeEventListener('store-console:scanner-engine-changed', onChange);
    }, []);

    const setEngine = useCallback((next: ScannerEngineId) => {
        window.localStorage.setItem(STORAGE_KEY, next);
        window.dispatchEvent(new Event('store-console:scanner-engine-changed'));
        setEngineState(next);
    }, []);

    return { engine, setEngine };
}