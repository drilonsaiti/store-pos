import {beforeEach, describe, expect, it} from 'vitest';
import {useCartStore} from '../../../stores/cart-store';
import {Product} from "../../../types/product";

const product: Product = {
    id: 'p1',
    name: 'Coca Cola',
    barCode: '5449000000996',
    price: 1.5,
    purchasePrice: 1,
    quantity: 20,
    saleUnit: 'piece'
};

describe('cart store', () => {
    beforeEach(() => useCartStore.getState().clear());

    it('adds a product and increments quantity on repeated scans', () => {
        useCartStore.getState().addProduct(product);
        useCartStore.getState().addProduct(product);
        expect(useCartStore.getState().items).toHaveLength(1);
        expect(useCartStore.getState().items[0]?.quantity).toBe(2);
    });

    it('decrements and removes at zero', () => {
        useCartStore.getState().addProduct(product);
        useCartStore.getState().decrementItem(product.id);
        expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('calculates total and total quantity', () => {
        useCartStore.getState().addProduct(product);
        useCartStore.getState().setQuantity(product.id, 3);
        expect(useCartStore.getState().total()).toBeCloseTo(4.5, 10);
        expect(useCartStore.getState().totalQuantity()).toBe(3);
    });

    it('removing a product clears it entirely', () => {
        useCartStore.getState().addProduct(product);
        useCartStore.getState().removeItem(product.id);
        expect(useCartStore.getState().items).toHaveLength(0);
    });
});
