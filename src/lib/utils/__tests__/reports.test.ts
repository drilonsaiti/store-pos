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

    it('reports totalRevenue net of a refund, not the sale\'s gross totalPrice', () => {
        const sale = makeSale({
            date: targetDate.toISOString(),
            totalPrice: 100,
            totalQuantity: 2,
            refunds: [
                {
                    id: 'r1',
                    date: targetDate.toISOString(),
                    amount: 30,
                    lines: [{idProduct: 'p1', name: 'Widget', quantity: 1, price: 30}],
                },
            ],
        });
        const report = buildEndOfDayReport([sale], targetDate);
        // 100 gross - 30 refunded = 70 net
        expect(report.totalRevenue).toBe(70);
    });

    it('reports totalQuantity net of refunded units', () => {
        const sale = makeSale({
            date: targetDate.toISOString(),
            totalPrice: 100,
            totalQuantity: 5,
            refunds: [
                {
                    id: 'r1',
                    date: targetDate.toISOString(),
                    amount: 20,
                    lines: [{idProduct: 'p1', name: 'Widget', quantity: 2, price: 10}],
                },
            ],
        });
        const report = buildEndOfDayReport([sale], targetDate);
        // 5 sold - 2 refunded = 3 net units
        expect(report.totalQuantity).toBe(3);
    });

    it('sums refunded quantity across multiple refund lines and multiple refunds on the same sale', () => {
        const sale = makeSale({
            date: targetDate.toISOString(),
            totalPrice: 100,
            totalQuantity: 10,
            refunds: [
                {
                    id: 'r1',
                    date: targetDate.toISOString(),
                    amount: 10,
                    lines: [
                        {idProduct: 'p1', name: 'Widget', quantity: 1, price: 5},
                        {idProduct: 'p2', name: 'Gadget', quantity: 1, price: 5},
                    ],
                },
                {
                    id: 'r2',
                    date: targetDate.toISOString(),
                    amount: 5,
                    lines: [{idProduct: 'p1', name: 'Widget', quantity: 1, price: 5}],
                },
            ],
        });
        const report = buildEndOfDayReport([sale], targetDate);
        // 10 sold - (1 + 1 + 1) refunded across both refunds = 7 net units
        expect(report.totalQuantity).toBe(7);
    });

    it('applies net-of-refund revenue per employee too, not just in the overall total', () => {
        const sales = [
            makeSale({
                date: targetDate.toISOString(),
                totalPrice: 50,
                totalQuantity: 2,
                employeeId: 'e1',
                employeeName: 'Ana',
                refunds: [
                    {
                        id: 'r1',
                        date: targetDate.toISOString(),
                        amount: 15,
                        lines: [{idProduct: 'p1', name: 'Widget', quantity: 1, price: 15}],
                    },
                ],
            }),
        ];
        const report = buildEndOfDayReport(sales, targetDate);
        const ana = report.byEmployee.find((e) => e.employeeId === 'e1');
        expect(ana?.totalRevenue).toBe(35); // 50 - 15
    });

    it('treats a sale with no refunds field the same as one with an explicit empty array', () => {
        const withUndefinedRefunds = makeSale({date: targetDate.toISOString(), totalPrice: 40, totalQuantity: 4});
        const withEmptyRefunds = makeSale({
            date: targetDate.toISOString(),
            totalPrice: 40,
            totalQuantity: 4,
            refunds: [],
        });
        const reportA = buildEndOfDayReport([withUndefinedRefunds], targetDate);
        const reportB = buildEndOfDayReport([withEmptyRefunds], targetDate);
        expect(reportA.totalRevenue).toBe(40);
        expect(reportB.totalRevenue).toBe(40);
    });

    it('falls back to 0 quantity for a legacy/malformed sale record missing totalQuantity', () => {
        // Simulates a pre-existing record from before totalQuantity was a
        // required field — buildEndOfDayReport should not throw or produce
        // NaN when it's absent.
        const legacySale = makeSale({date: targetDate.toISOString(), totalPrice: 40});
        delete (legacySale as {totalQuantity?: number}).totalQuantity;
        const report = buildEndOfDayReport([legacySale], targetDate);
        expect(report.totalQuantity).toBe(0);
        expect(Number.isNaN(report.totalQuantity)).toBe(false);
    });
});