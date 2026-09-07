import {describe, expect, it} from 'vitest';
import {computeStockDeltas, getAvailableQuantity, isLineOversold} from '../stock';
import {Product} from "../../../types/product";

function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
        id: 'p1',
        name: 'Widget',
        barCode: '123456',
        price: 2.5,
        purchasePrice: 1,
        quantity: 10,
        saleUnit: 'piece',
        weightUnit: 'kg',
        packageOption: null,
        ...overrides,
    };
}

describe('computeStockDeltas', () => {
    it('decrements a piece line by its quantity when sign is -1 (checkout)', () => {
        const products = [makeProduct({id: 'p1', quantity: 10})];
        const deltas = computeStockDeltas(
            [{idProduct: 'p1', quantity: 3, mode: 'piece'}],
            products,
            -1
        );
        expect(deltas).toEqual([{productId: 'p1', delta: -3}]);
    });

    it('increments a piece line by its quantity when sign is +1 (refund)', () => {
        const products = [makeProduct({id: 'p1', quantity: 10})];
        const deltas = computeStockDeltas(
            [{idProduct: 'p1', quantity: 2, mode: 'piece'}],
            products,
            1
        );
        expect(deltas).toEqual([{productId: 'p1', delta: 2}]);
    });

    it('treats a weight line as raw amount, not converted to pieces', () => {
        const products = [makeProduct({id: 'p1', saleUnit: 'weight', quantity: 5})];
        const deltas = computeStockDeltas(
            [{idProduct: 'p1', quantity: 0.35, mode: 'weight'}],
            products,
            -1
        );
        expect(deltas).toEqual([{productId: 'p1', delta: -0.35}]);
    });

    it('converts a package line to pieces using packageOption.piecesPerPackage', () => {
        const products = [
            makeProduct({id: 'p1', quantity: 100, packageOption: {piecesPerPackage: 24, packagePrice: 20}}),
        ];
        const deltas = computeStockDeltas(
            [{idProduct: 'p1', quantity: 2, mode: 'package'}],
            products,
            -1
        );
        // 2 packages * 24 pieces/package = 48 pieces decremented
        expect(deltas).toEqual([{productId: 'p1', delta: -48}]);
    });

    it('falls back to a multiplier of 1 for a package line with no packageOption on record', () => {
        const products = [makeProduct({id: 'p1', packageOption: null})];
        const deltas = computeStockDeltas(
            [{idProduct: 'p1', quantity: 3, mode: 'package'}],
            products,
            -1
        );
        expect(deltas).toEqual([{productId: 'p1', delta: -3}]);
    });

    it('skips a line whose product no longer exists, without throwing', () => {
        const products = [makeProduct({id: 'p1'})];
        const deltas = computeStockDeltas(
            [{idProduct: 'deleted-product', quantity: 5, mode: 'piece'}],
            products,
            -1
        );
        expect(deltas).toEqual([]);
    });

    it('aggregates multiple lines for the same product into a single delta', () => {
        const products = [makeProduct({id: 'p1'})];
        const deltas = computeStockDeltas(
            [
                {idProduct: 'p1', quantity: 2, mode: 'piece'},
                {idProduct: 'p1', quantity: 3, mode: 'piece'},
            ],
            products,
            -1
        );
        expect(deltas).toEqual([{productId: 'p1', delta: -5}]);
    });

    it('produces one entry per distinct product for a mixed cart', () => {
        const products = [makeProduct({id: 'p1'}), makeProduct({id: 'p2', quantity: 20})];
        const deltas = computeStockDeltas(
            [
                {idProduct: 'p1', quantity: 1, mode: 'piece'},
                {idProduct: 'p2', quantity: 4, mode: 'piece'},
            ],
            products,
            -1
        );
        expect(deltas).toEqual(
            expect.arrayContaining([
                {productId: 'p1', delta: -1},
                {productId: 'p2', delta: -4},
            ])
        );
        expect(deltas).toHaveLength(2);
    });

    it('returns an empty array for an empty line list', () => {
        expect(computeStockDeltas([], [makeProduct()], -1)).toEqual([]);
    });
});

describe('getAvailableQuantity', () => {
    it('returns the live product quantity when the product exists', () => {
        const products = [makeProduct({id: 'p1', quantity: 7})];
        expect(getAvailableQuantity('p1', products)).toBe(7);
    });

    it('returns null when the product cannot be found', () => {
        expect(getAvailableQuantity('missing', [makeProduct({id: 'p1'})])).toBeNull();
    });
});

describe('isLineOversold', () => {
    it('is false when requested quantity is within stock', () => {
        const products = [makeProduct({id: 'p1', quantity: 10})];
        expect(isLineOversold({productId: 'p1', quantity: 5, mode: 'piece'}, products)).toBe(false);
    });

    it('is false exactly at the stock boundary (not strictly greater)', () => {
        const products = [makeProduct({id: 'p1', quantity: 10})];
        expect(isLineOversold({productId: 'p1', quantity: 10, mode: 'piece'}, products)).toBe(false);
    });

    it('is true when requested quantity exceeds stock by any amount', () => {
        const products = [makeProduct({id: 'p1', quantity: 10})];
        expect(isLineOversold({productId: 'p1', quantity: 11, mode: 'piece'}, products)).toBe(true);
    });

    it('accounts for the package multiplier when checking oversell', () => {
        const products = [
            makeProduct({id: 'p1', quantity: 10, packageOption: {piecesPerPackage: 6, packagePrice: 5}}),
        ];
        // 2 packages * 6 = 12 pieces requested against 10 in stock
        expect(isLineOversold({productId: 'p1', quantity: 2, mode: 'package'}, products)).toBe(true);
        // 1 package * 6 = 6 pieces requested against 10 in stock
        expect(isLineOversold({productId: 'p1', quantity: 1, mode: 'package'}, products)).toBe(false);
    });

    it('is false (not true) for a product that no longer exists — a separate concern from oversell', () => {
        expect(isLineOversold({productId: 'missing', quantity: 999, mode: 'piece'}, [])).toBe(false);
    });
});