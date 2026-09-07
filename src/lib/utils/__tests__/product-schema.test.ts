import { describe, it, expect } from 'vitest';
import {productSchema} from "../../validation/product-schema";

const basePiece = {
    name: 'Milk',
    barCode: '123456',
    price: 2,
    purchasePrice: 1,
    quantity: 10,
    saleUnit: 'piece' as const,
};

describe('productSchema', () => {
    it('accepts a plain piece-sold product', () => {
        expect(productSchema.safeParse(basePiece).success).toBe(true);
    });

    it('requires a weightUnit when saleUnit is weight', () => {
        const result = productSchema.safeParse({ ...basePiece, saleUnit: 'weight', weightUnit: undefined });
        expect(result.success).toBe(false);
    });

    it('accepts a weight-sold product with a weightUnit', () => {
        const result = productSchema.safeParse({ ...basePiece, saleUnit: 'weight', weightUnit: 'kg' });
        expect(result.success).toBe(true);
    });

    it('requires piecesPerPackage and packagePrice when packageEnabled is true', () => {
        const result = productSchema.safeParse({ ...basePiece, packageEnabled: true });
        expect(result.success).toBe(false);
    });

    it('accepts a piece product with a valid package option', () => {
        const result = productSchema.safeParse({
            ...basePiece,
            packageEnabled: true,
            piecesPerPackage: 12,
            packagePrice: 20,
        });
        expect(result.success).toBe(true);
    });

    it('rejects a barcode with disallowed characters', () => {
        expect(productSchema.safeParse({ ...basePiece, barCode: 'abc def!' }).success).toBe(false);
    });

    it('rejects a negative price', () => {
        expect(productSchema.safeParse({ ...basePiece, price: -1 }).success).toBe(false);
    });
});