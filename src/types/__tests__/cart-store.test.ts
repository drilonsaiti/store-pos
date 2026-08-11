import {beforeEach, describe, expect, it} from 'vitest';
import {useCartStore} from '../../stores/cart-store';
import type {Product} from '../product';

const product: Product = {
    id: 'p1',
    name: 'Coca Cola',
    barCode: '5449000000996',
    price: 1.5,
    purchasePrice: 1,
    quantity: 20,
    saleUnit: 'piece',
    weightUnit: 'kg',
    packageOption: null,
};

const lineId = `${product.id}::piece`;

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
        useCartStore.getState().decrementItem(lineId);
        expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('calculates total and total quantity', () => {
        useCartStore.getState().addProduct(product);
        useCartStore.getState().setQuantity(lineId, 3);
        expect(useCartStore.getState().total()).toBeCloseTo(4.5, 10);
        expect(useCartStore.getState().totalQuantity()).toBe(3);
    });

    it('removing a product clears it entirely', () => {
        useCartStore.getState().addProduct(product);
        useCartStore.getState().removeItem(lineId);
        expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('adds a weight line with fractional quantity and combines repeated adds', () => {
        const weighed: Product = {...product, id: 'p2', saleUnit: 'weight', weightUnit: 'kg'};
        useCartStore.getState().addLine({
            product: weighed,
            mode: 'weight',
            quantity: 0.5,
            unitPrice: 4,
            unitLabel: 'kg'
        });
        useCartStore.getState().addLine({
            product: weighed,
            mode: 'weight',
            quantity: 0.25,
            unitPrice: 4,
            unitLabel: 'kg'
        });
        const line = useCartStore.getState().items.find((i) => i.lineId === `${weighed.id}::weight`);
        expect(line?.quantity).toBeCloseTo(0.75, 5);
    });

    it('keeps a package line separate from a piece line for the same product', () => {
        const packaged: Product = {
            ...product,
            id: 'p3',
            packageOption: {piecesPerPackage: 12, packagePrice: 15},
        };
        useCartStore.getState().addProduct(packaged);
        useCartStore.getState().addLine({
            product: packaged,
            mode: 'package',
            quantity: 1,
            unitPrice: 15,
            unitLabel: 'pkg of 12'
        });
        expect(useCartStore.getState().items).toHaveLength(2);
    });
});