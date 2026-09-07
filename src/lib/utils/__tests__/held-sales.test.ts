import { describe, it, expect, beforeEach } from 'vitest';
import {getHeldSales, holdSale, removeHeldSale} from "../../pos/held-sales";
import {CartItem} from "../../../types/cart";


const items: CartItem[] = [
    { lineId: 'p1::piece', productId: 'p1', name: 'Milk', barcode: '1', mode: 'piece', price: 2, purchasePrice: 1, quantity: 3 },
];

describe('held sales storage', () => {
    beforeEach(() => window.localStorage.clear());

    it('holds a sale and reads it back with its items intact', () => {
        holdSale(items, 'Table 4');
        const held = getHeldSales();
        expect(held).toHaveLength(1);
        expect(held[0]?.label).toBe('Table 4');
        expect(held[0]?.items).toEqual(items);
    });

    it('adds new held sales to the front of the list', () => {
        holdSale(items, 'First');
        holdSale(items, 'Second');
        expect(getHeldSales().map((s) => s.label)).toEqual(['Second', 'First']);
    });

    it('removes a held sale by id without touching the others', () => {
        const a = holdSale(items, 'A');
        holdSale(items, 'B');
        removeHeldSale(a.id);
        const remaining = getHeldSales();
        expect(remaining).toHaveLength(1);
        expect(remaining[0]?.label).toBe('B');
    });
});