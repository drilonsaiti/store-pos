'use client';

import {useCallback, useEffect, useState} from 'react';
import {getHeldSales, holdSale, removeHeldSale} from '@/lib/pos/held-sales';
import type {HeldSale} from '@/types/held-sale';
import type {CartItem} from '@/types/cart';

export function useHeldSales() {
    const [heldSales, setHeldSales] = useState<HeldSale[]>([]);

    const refresh = useCallback(() => setHeldSales(getHeldSales()), []);

    useEffect(() => {
        refresh();
        window.addEventListener('store-console:held-sales-changed', refresh);
        return () => window.removeEventListener('store-console:held-sales-changed', refresh);
    }, [refresh]);

    const hold = useCallback(
        (items: CartItem[], label: string) => {
            const entry = holdSale(items, label);
            refresh();
            return entry;
        },
        [refresh]
    );

    const remove = useCallback(
        (id: string) => {
            removeHeldSale(id);
            refresh();
        },
        [refresh]
    );

    return {heldSales, hold, remove};
}