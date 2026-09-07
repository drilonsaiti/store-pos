import { describe, it, expect } from 'vitest';
import { getRefundedQuantity, getSaleRefundedTotal, getSaleNetTotal } from '../refund';
import {Sale} from "../../../types/sale";

const baseSale: Sale = {
    id: 's1',
    date: new Date().toISOString(),
    totalPrice: 20,
    totalQuantity: 4,
    products: [
        { idProduct: 'p1', name: 'Milk', barCode: '1', price: 2, purchasePrice: 1, quantity: 4, date: new Date().toISOString(), mode: 'piece' },
    ],
};

describe('refund utils', () => {
    it('treats a sale with no refunds as fully un-refunded', () => {
        expect(getSaleRefundedTotal(baseSale)).toBe(0);
        expect(getSaleNetTotal(baseSale)).toBe(20);
        expect(getRefundedQuantity(baseSale, 'p1', 'piece')).toBe(0);
    });

    it('sums refunded quantity across multiple refund events for the same line', () => {
        const sale: Sale = {
            ...baseSale,
            refunds: [
                { id: 'r1', date: new Date().toISOString(), amount: 4, lines: [{ idProduct: 'p1', name: 'Milk', quantity: 2, price: 2, mode: 'piece' }] },
                { id: 'r2', date: new Date().toISOString(), amount: 2, lines: [{ idProduct: 'p1', name: 'Milk', quantity: 1, price: 2, mode: 'piece' }] },
            ],
        };
        expect(getRefundedQuantity(sale, 'p1', 'piece')).toBe(3);
        expect(getSaleRefundedTotal(sale)).toBe(6);
        expect(getSaleNetTotal(sale)).toBe(14);
    });

    it('keeps a package-mode refund separate from a piece-mode refund of the same product', () => {
        const sale: Sale = {
            ...baseSale,
            refunds: [
                { id: 'r1', date: new Date().toISOString(), amount: 15, lines: [{ idProduct: 'p1', name: 'Milk', quantity: 1, price: 15, mode: 'package' }] },
            ],
        };
        expect(getRefundedQuantity(sale, 'p1', 'piece')).toBe(0);
        expect(getRefundedQuantity(sale, 'p1', 'package')).toBe(1);
    });

    it('defaults an undefined mode to "piece" on both sides of the comparison', () => {
        const sale: Sale = {
            ...baseSale,
            refunds: [{ id: 'r1', date: new Date().toISOString(), amount: 2, lines: [{ idProduct: 'p1', name: 'Milk', quantity: 1, price: 2 }] }],
        };
        expect(getRefundedQuantity(sale, 'p1', undefined)).toBe(1);
        expect(getRefundedQuantity(sale, 'p1', 'piece')).toBe(1);
    });
});