'use client';

import {useCallback, useEffect, useState, useSyncExternalStore} from 'react';

export interface CurrentEmployee {
    id: string;
    name: string;
}

const STORAGE_KEY = 'store-console:current-employee';
const CHANGE_EVENT = 'store-console:current-employee-changed';

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

function subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener('storage', callback);

    return () => {
        window.removeEventListener(CHANGE_EVENT, callback);
        window.removeEventListener('storage', callback);
    };
}

/**
 * Which employee is currently working the register, persisted locally per
 * device — a lightweight shift marker, not a login (Firebase Auth already
 * covers actual account access). Every sale gets tagged with whoever's
 * selected here, which is what the end-of-day report groups by.
 */
export function useCurrentEmployee() {
    const employee = useSyncExternalStore(
        subscribe,
        readCurrentEmployee,
        () => null,
    );

    const setEmployee = useCallback((employee: CurrentEmployee | null) => {
        if (employee) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(employee));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }

        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, []);

    return {
        employee,
        setEmployee,
    };
}