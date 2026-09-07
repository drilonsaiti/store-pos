// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { renderHook } from '@testing-library/react';
import {CartItem} from "../../../types/cart";
import {useHeldSales} from "../../../hooks/use-held-sales";



const items: CartItem[] = [
    { lineId: 'p1::piece', productId: 'p1', name: 'Milk', barcode: '1', mode: 'piece', price: 2, purchasePrice: 1, quantity: 3 },
];

describe('useHeldSales', () => {
    beforeEach(() => window.localStorage.clear());

    it('starts empty', () => {
        const { result } = renderHook(() => useHeldSales());
        expect(result.current.heldSales).toHaveLength(0);
    });

    it('holding a sale updates the list immediately', () => {
        const { result } = renderHook(() => useHeldSales());
        act(() => {
            result.current.hold(items, 'Table 4');
        });
        expect(result.current.heldSales).toHaveLength(1);
        expect(result.current.heldSales[0]?.label).toBe('Table 4');
    });

    it('removing a held sale updates the list immediately', () => {
        const { result } = renderHook(() => useHeldSales());
        let heldId = '';
        act(() => {
            heldId = result.current.hold(items, 'Table 4').id;
        });
        act(() => {
            result.current.remove(heldId);
        });
        expect(result.current.heldSales).toHaveLength(0);
    });
});