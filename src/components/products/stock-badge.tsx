'use client';

import {Badge} from '@/components/ui/badge';
import {getStockStatus, type StockStatus} from '@/types/product';
import {useLowStockThreshold} from '@/hooks/use-low-stock-threshold';

const LABELS: Record<StockStatus, string> = {
    'in-stock': 'In stock',
    'low-stock': 'Low stock',
    'out-of-stock': 'Out of stock',
};

const VARIANTS: Record<StockStatus, 'success' | 'warning' | 'destructive'> = {
    'in-stock': 'success',
    'low-stock': 'warning',
    'out-of-stock': 'destructive',
};

export function StockBadge({quantity}: { quantity: number }) {
    const {threshold} = useLowStockThreshold();
    const status = getStockStatus(quantity, threshold);
    return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}