import type {Sale} from '@/types/sale';
import {getSaleNetTotal} from '@/lib/utils/refund';
import {toDateKey} from '@/lib/utils/dates';

// Re-exported so existing `import {toDateKey} from '@/lib/utils/reports'`
// call sites (e.g. the end-of-day report page) keep working — the
// implementation itself now lives in dates.ts, next to isToday(), as the
// single source of truth for local-day bucketing.
export {toDateKey};

export interface EmployeeReportLine {
    employeeId: string;
    employeeName: string;
    salesCount: number;
    totalQuantity: number;
    totalRevenue: number;
}

export interface EndOfDayReport {
    date: string;
    sales: Sale[];
    totalRevenue: number;
    totalQuantity: number;
    salesCount: number;
    byEmployee: EmployeeReportLine[];
}

/** Total quantity refunded across every line of a sale — used to report net
 * (not gross) units moved. */
function saleRefundedQuantity(sale: Sale): number {
    return (sale.refunds ?? []).reduce(
        (sum, r) => sum + r.lines.reduce((s, l) => s + l.quantity, 0),
        0
    );
}

/** All revenue/quantity figures here are net of refunds — a sale's
 * totalPrice/totalQuantity minus anything refunded from it — so a refunded
 * sale stops overstating what the store actually took in. */
export function buildEndOfDayReport(sales: Sale[], date: Date): EndOfDayReport {
    const dayKey = toDateKey(date);
    const daySales = sales
        .filter((s) => toDateKey(new Date(s.date)) === dayKey)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const byEmployeeMap = new Map<string, EmployeeReportLine>();
    for (const sale of daySales) {
        const employeeId = sale.employeeId ?? 'unassigned';
        const employeeName = sale.employeeName ?? 'Unassigned';
        const existing = byEmployeeMap.get(employeeId) ?? {
            employeeId,
            employeeName,
            salesCount: 0,
            totalQuantity: 0,
            totalRevenue: 0,
        };
        existing.salesCount += 1;
        existing.totalQuantity += (sale.totalQuantity ?? 0) - saleRefundedQuantity(sale);
        existing.totalRevenue += getSaleNetTotal(sale);
        byEmployeeMap.set(employeeId, existing);
    }

    return {
        date: dayKey,
        sales: daySales,
        totalRevenue: daySales.reduce((sum, s) => sum + getSaleNetTotal(s), 0),
        totalQuantity: daySales.reduce((sum, s) => sum + (s.totalQuantity ?? 0) - saleRefundedQuantity(s), 0),
        salesCount: daySales.length,
        byEmployee: Array.from(byEmployeeMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
    };
}