import { describe, it, expect } from 'vitest';
import { toDateKey, buildEndOfDayReport } from '../reports';
import {Sale} from "../../../types/sale";

function makeSale(overrides: Partial<Sale> & { date: string }): Sale {
    return {
        id: Math.random().toString(36).slice(2),
        products: [],
        totalPrice: 0,
        totalQuantity: 0,
        ...overrides,
    };
}

describe('toDateKey', () => {
    it('formats as zero-padded yyyy-mm-dd', () => {
        expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
        expect(toDateKey(new Date(2026, 10, 23))).toBe('2026-11-23');
    });
});

describe('buildEndOfDayReport', () => {
    const targetDate = new Date(2026, 5, 15); // 2026-06-15

    it('only includes sales from the given day', () => {
        const sales = [
            makeSale({ date: new Date(2026, 5, 15, 9).toISOString(), totalPrice: 10, totalQuantity: 1 }),
            makeSale({ date: new Date(2026, 5, 14, 23).toISOString(), totalPrice: 20, totalQuantity: 2 }),
        ];
        const report = buildEndOfDayReport(sales, targetDate);
        expect(report.salesCount).toBe(1);
        expect(report.totalRevenue).toBe(10);
    });

    it('groups revenue by employee, sorted descending, with an "unassigned" bucket', () => {
        const sales = [
            makeSale({ date: targetDate.toISOString(), totalPrice: 30, totalQuantity: 1, employeeId: 'e1', employeeName: 'Ana' }),
            makeSale({ date: targetDate.toISOString(), totalPrice: 50, totalQuantity: 2, employeeId: 'e2', employeeName: 'Beni' }),
            makeSale({ date: targetDate.toISOString(), totalPrice: 5, totalQuantity: 1 }),
        ];
        const report = buildEndOfDayReport(sales, targetDate);
        expect(report.byEmployee[0]?.employeeName).toBe('Beni');
        expect(report.byEmployee.find((e) => e.employeeId === 'unassigned')?.employeeName).toBe('Unassigned');
        expect(report.totalRevenue).toBe(85);
        expect(report.totalQuantity).toBe(4);
    });

    it('returns an empty report for a day with no sales', () => {
        const report = buildEndOfDayReport([], targetDate);
        expect(report.salesCount).toBe(0);
        expect(report.byEmployee).toHaveLength(0);
    });
});