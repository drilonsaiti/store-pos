'use client';

import {useCallback, useMemo, useSyncExternalStore} from 'react';

export interface CurrentEmployee {
    id: string;
    name: string;
}

const STORAGE_KEY = 'store-console:current-employee';
const CHANGE_EVENT = 'store-console:current-employee-changed';

function getSnapshot(): string | null {
    if (typeof window === 'undefined') return null;

    return window.localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): null {
    return null;
}

function subscribe(callback: () => void) {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener('storage', callback);

    return () => {
        window.removeEventListener(CHANGE_EVENT, callback);
        window.removeEventListener('storage', callback);
    };
}

function parseEmployee(raw: string | null): CurrentEmployee | null {
    if (!raw) return null;

    try {
        const parsed: unknown = JSON.parse(raw);

        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'id' in parsed &&
            'name' in parsed &&
            typeof parsed.id === 'string' &&
            typeof parsed.name === 'string'
        ) {
            return {
                id: parsed.id,
                name: parsed.name,
            };
        }
    } catch {
        // Ignore malformed localStorage data.
    }

    return null;
}

/**
 * Which employee is currently working the register, persisted locally per
 * device. This is shift attribution only, not authentication.
 */
export function useCurrentEmployee() {
    const rawEmployee = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );

    const employee = useMemo(
        () => parseEmployee(rawEmployee),
        [rawEmployee],
    );

    const setEmployee = useCallback(
        (employee: CurrentEmployee | null) => {
            if (employee) {
                window.localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(employee),
                );
            } else {
                window.localStorage.removeItem(STORAGE_KEY);
            }

            // The native "storage" event does not fire in the same tab
            // that made the change, so notify subscribers explicitly.
            window.dispatchEvent(new Event(CHANGE_EVENT));
        },
        [],
    );

    return {
        employee,
        setEmployee,
    };
}