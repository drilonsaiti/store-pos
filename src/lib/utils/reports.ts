import type {Sale} from '@/types/sale';

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

/** yyyy-mm-dd in LOCAL time — matches how isToday() in lib/utils/dates.ts compares dates. */
export function toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

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
        existing.totalQuantity += sale.totalQuantity ?? 0;
        existing.totalRevenue += sale.totalPrice;
        byEmployeeMap.set(employeeId, existing);
    }

    return {
        date: dayKey,
        sales: daySales,
        totalRevenue: daySales.reduce((sum, s) => sum + s.totalPrice, 0),
        totalQuantity: daySales.reduce((sum, s) => sum + (s.totalQuantity ?? 0), 0),
        salesCount: daySales.length,
        byEmployee: Array.from(byEmployeeMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
    };
}