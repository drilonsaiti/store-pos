'use client';

import {useCallback, useSyncExternalStore} from 'react';
import {getHeldSales, holdSale, removeHeldSale} from '@/lib/pos/held-sales';
import type {HeldSale} from '@/types/held-sale';
import type {CartItem} from '@/types/cart';

let cachedHeldSales: HeldSale[] | null = null;

function readHeldSales(): HeldSale[] {
    if (cachedHeldSales === null) {
        cachedHeldSales = getHeldSales();
    }

    return cachedHeldSales;
}

function subscribe(callback: () => void) {
    const handleChange = () => {
        cachedHeldSales = null;
        callback();
    };

    window.addEventListener(
        'store-console:held-sales-changed',
        handleChange,
    );
    window.addEventListener('storage', handleChange);

    return () => {
        window.removeEventListener(
            'store-console:held-sales-changed',
            handleChange,
        );
        window.removeEventListener('storage', handleChange);
    };
}

export function useHeldSales() {
    const heldSales = useSyncExternalStore(
        subscribe,
        readHeldSales,
        () => [],
    );

    const hold = useCallback((items: CartItem[], label: string) => {
        const entry = holdSale(items, label);
        cachedHeldSales = null;
        return entry;
    }, []);

    const remove = useCallback((id: string) => {
        removeHeldSale(id);
        cachedHeldSales = null;
    }, []);

    return {heldSales, hold, remove};
}