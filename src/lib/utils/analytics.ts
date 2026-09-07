import type {Sale} from '@/types/sale';
import {getSaleNetTotal} from '@/lib/utils/refund';
import {toDateKey} from '@/lib/utils/dates';

export interface DailyRevenuePoint {
    /** Short label for the chart axis, e.g. "09 Aug" */
    label: string;
    date: string;
    revenue: number;
}

/** How much of a given line's sold quantity has been refunded — same
 * matching rule (product + mode) as getRefundedQuantity() in refund.ts. */
function refundedLineQuantity(sale: Sale, idProduct: string, mode: string | undefined): number {
    return (sale.refunds ?? []).reduce((sum, refund) => {
        const matching = refund.lines.filter(
            (l) => l.idProduct === idProduct && (l.mode ?? 'piece') === (mode ?? 'piece')
        );
        return sum + matching.reduce((s, l) => s + l.quantity, 0);
    }, 0);
}

/** Builds a fixed-length trailing window (default 14 days) so days with no
 * sales still show as 0. Uses net-of-refund revenue — a sale's totalPrice
 * minus anything refunded from it — so a refunded sale doesn't keep
 * inflating a past day's numbers. */
export function getDailyRevenue(sales: Sale[], days = 14): DailyRevenuePoint[] {
    const buckets = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        buckets.set(toDateKey(d), 0);
    }

    for (const sale of sales) {
        const key = toDateKey(new Date(sale.date));
        if (buckets.has(key)) {
            buckets.set(key, (buckets.get(key) ?? 0) + getSaleNetTotal(sale));
        }
    }

    return Array.from(buckets.entries()).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
        // Parse with an explicit local-time component (`T00:00:00`, no `Z`) —
        // a bare "yyyy-mm-dd" string is parsed as UTC midnight by Date(),
        // which would then mis-render the label a day off in any timezone
        // behind UTC once `date` here is itself already a local-day key.
        label: new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}),
    }));
}

export interface TopProductPoint {
    name: string;
    quantity: number;
}

/** Aggregates net quantity sold per product — sold minus refunded — across
 * all sale line items, so a returned item stops counting as "sold". */
export function getTopProducts(sales: Sale[], limit = 5): TopProductPoint[] {
    const totals = new Map<string, number>();
    for (const sale of sales) {
        for (const line of sale.products) {
            const netQuantity = line.quantity - refundedLineQuantity(sale, line.idProduct, line.mode);
            if (netQuantity <= 0) continue;
            totals.set(line.name, (totals.get(line.name) ?? 0) + netQuantity);
        }
    }
    return Array.from(totals.entries())
        .map(([name, quantity]) => ({name, quantity}))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit);
}