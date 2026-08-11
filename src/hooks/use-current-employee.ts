'use client';

import {useCallback, useEffect, useState} from 'react';

export interface CurrentEmployee {
    id: string;
    name: string;
}

const STORAGE_KEY = 'store-console:current-employee';

function readCurrentEmployee(): CurrentEmployee | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') return parsed;
        return null;
    } catch {
        return null;
    }
}

/**
 * Which employee is currently working the register, persisted locally per
 * device — a lightweight shift marker, not a login (Firebase Auth already
 * covers actual account access). Every sale gets tagged with whoever's
 * selected here, which is what the end-of-day report groups by.
 */
export function useCurrentEmployee() {
    const [employee, setEmployeeState] = useState<CurrentEmployee | null>(null);

    useEffect(() => {
        setEmployeeState(readCurrentEmployee());
        const onChange = () => setEmployeeState(readCurrentEmployee());
        window.addEventListener('store-console:current-employee-changed', onChange);
        return () => window.removeEventListener('store-console:current-employee-changed', onChange);
    }, []);

    const setEmployee = useCallback((next: CurrentEmployee | null) => {
        if (next) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } else {
            window.localStorage.removeItem(STORAGE_KEY);
        }
        window.dispatchEvent(new Event('store-console:current-employee-changed'));
        setEmployeeState(next);
    }, []);

    return {employee, setEmployee};
}