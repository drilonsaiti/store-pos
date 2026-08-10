import type {Sale} from '@/types/sale';

export interface DailyRevenuePoint {
    /** Short label for the chart axis, e.g. "09 Aug" */
    label: string;
    date: string;
    revenue: number;
}

/** Builds a fixed-length trailing window (default 14 days) so days with no sales still show as 0. */
export function getDailyRevenue(sales: Sale[], days = 14): DailyRevenuePoint[] {
    const buckets = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        buckets.set(d.toISOString().slice(0, 10), 0);
    }

    for (const sale of sales) {
        const key = new Date(sale.date).toISOString().slice(0, 10);
        if (buckets.has(key)) {
            buckets.set(key, (buckets.get(key) ?? 0) + sale.totalPrice);
        }
    }

    return Array.from(buckets.entries()).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
        label: new Date(date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}),
    }));
}

export interface TopProductPoint {
    name: string;
    quantity: number;
}

/** Aggregates quantity sold per product across all sale line items. */
export function getTopProducts(sales: Sale[], limit = 5): TopProductPoint[] {
    const totals = new Map<string, number>();
    for (const sale of sales) {
        for (const line of sale.products) {
            totals.set(line.name, (totals.get(line.name) ?? 0) + line.quantity);
        }
    }
    return Array.from(totals.entries())
        .map(([name, quantity]) => ({name, quantity}))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit);
}