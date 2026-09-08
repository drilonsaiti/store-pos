import {afterAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {get, ref} from 'firebase/database';
import type {Database} from 'firebase/database';
import {clearData, staffDb, teardownTestEnv} from './emulator-helpers';
import {ProductInput} from "../../../types/product";
import {
    bulkCreateProducts,
    createProduct,
    deleteProduct,
    DuplicateBarcodeError,
    getProducts, incrementProductQuantity,
    updateProduct
} from "../products";
import type * as ClientModule from '../client';

const state = vi.hoisted(() => ({db: null as Database | null}));

vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof ClientModule>();
    return {
        ...actual,
        getDb: () => state.db as Database,
    };
});


function makeProductInput(overrides: Partial<ProductInput> = {}): ProductInput {
    return {
        name: 'Widget',
        barCode: `bc-${Math.random().toString(36).slice(2)}`,
        price: 10,
        purchasePrice: 5,
        quantity: 10,
        saleUnit: 'piece',
        weightUnit: 'kg',
        packageOption: null,
        ...overrides,
    };
}

beforeEach(async () => {
    await clearData();
    state.db = await staffDb();
});

afterAll(async () => {
    await teardownTestEnv();
});

describe('createProduct — barcode uniqueness (Fix #11)', () => {
    it('claims the barcode alongside the product atomically', async () => {
        const product = await createProduct(makeProductInput({barCode: '111'}));
        const claimSnap = await get(ref(state.db as Database, 'barcodes/111'));
        expect(claimSnap.val()).toBe(product.id);
    });

    it('rejects a second product using a barcode already claimed by another product', async () => {
        await createProduct(makeProductInput({barCode: '222'}));
        await expect(createProduct(makeProductInput({barCode: '222'}))).rejects.toThrow(DuplicateBarcodeError);
    });

    it('does not create the rejected product at all — the write is atomic', async () => {
        await createProduct(makeProductInput({barCode: '333'}));
        await expect(
            createProduct(makeProductInput({name: 'Should not exist', barCode: '333'}))
        ).rejects.toThrow();

        const products = await getProducts();
        expect(products.filter((p) => p.name === 'Should not exist')).toHaveLength(0);
    });

    it('allows two different products with two different barcodes', async () => {
        await createProduct(makeProductInput({barCode: '444'}));
        await expect(createProduct(makeProductInput({barCode: '555'}))).resolves.toBeDefined();
    });

    it('prevents two concurrent creates from both winning the same barcode', async () => {
        const attempt = () => createProduct(makeProductInput({barCode: 'race-code'}));
        const results = await Promise.allSettled([attempt(), attempt()]);
        const succeeded = results.filter((r) => r.status === 'fulfilled');
        const failed = results.filter((r) => r.status === 'rejected');

        expect(succeeded).toHaveLength(1);
        expect(failed).toHaveLength(1);

        const products = await getProducts();
        expect(products.filter((p) => p.barCode === 'race-code')).toHaveLength(1);
    });
});

describe('bulkCreateProducts', () => {
    it('creates every row and claims every barcode when all are distinct', async () => {
        const created = await bulkCreateProducts([
            makeProductInput({name: 'A', barCode: 'bulk-1'}),
            makeProductInput({name: 'B', barCode: 'bulk-2'}),
        ]);
        expect(created).toHaveLength(2);

        const claimA = await get(ref(state.db as Database, 'barcodes/bulk-1'));
        const claimB = await get(ref(state.db as Database, 'barcodes/bulk-2'));
        expect(claimA.exists()).toBe(true);
        expect(claimB.exists()).toBe(true);
    });

    it('rejects the whole batch when two rows in the same file share a barcode', async () => {
        await expect(
            bulkCreateProducts([
                makeProductInput({name: 'A', barCode: 'dup'}),
                makeProductInput({name: 'B', barCode: 'dup'}),
            ])
        ).rejects.toThrow(DuplicateBarcodeError);

        const products = await getProducts();
        expect(products).toHaveLength(0); // neither row was written
    });

    it('rejects the whole batch when one row collides with an existing catalog product', async () => {
        await createProduct(makeProductInput({barCode: 'existing'}));

        await expect(
            bulkCreateProducts([
                makeProductInput({name: 'New A', barCode: 'brand-new'}),
                makeProductInput({name: 'New B', barCode: 'existing'}),
            ])
        ).rejects.toThrow(DuplicateBarcodeError);

        const products = await getProducts();
        // "New A" must NOT have been created even though its own barcode
        // was fine on its own — the whole batch is one atomic write.
        expect(products.filter((p) => p.name === 'New A')).toHaveLength(0);
    });
});

describe('updateProduct — barcode reassignment', () => {
    it('releases the old barcode claim and takes the new one when the barcode changes', async () => {
        const product = await createProduct(makeProductInput({barCode: 'old-code'}));
        await updateProduct(product.id, {barCode: 'new-code'});

        const oldClaim = await get(ref(state.db as Database, 'barcodes/old-code'));
        const newClaim = await get(ref(state.db as Database, 'barcodes/new-code'));
        expect(oldClaim.exists()).toBe(false);
        expect(newClaim.val()).toBe(product.id);
    });

    it('lets a released barcode be claimed by a different, new product', async () => {
        const product = await createProduct(makeProductInput({barCode: 'reusable'}));
        await updateProduct(product.id, {barCode: 'moved-on'});

        await expect(createProduct(makeProductInput({barCode: 'reusable'}))).resolves.toBeDefined();
    });

    it('rejects reassigning to a barcode already owned by a different product', async () => {
        const productA = await createProduct(makeProductInput({barCode: 'a-code'}));
        await createProduct(makeProductInput({barCode: 'b-code'}));

        await expect(updateProduct(productA.id, {barCode: 'b-code'})).rejects.toThrow(DuplicateBarcodeError);

        // productA's own barcode must be unchanged after the rejected update.
        const products = await getProducts();
        const stillA = products.find((p) => p.id === productA.id);
        expect(stillA?.barCode).toBe('a-code');
    });

    it('does not touch the barcode index at all when the barcode is not part of the update', async () => {
        const product = await createProduct(makeProductInput({barCode: 'untouched'}));
        await updateProduct(product.id, {price: 99});

        const claim = await get(ref(state.db as Database, 'barcodes/untouched'));
        expect(claim.val()).toBe(product.id);

        const products = await getProducts();
        expect(products.find((p) => p.id === product.id)?.price).toBe(99);
    });

    it('is a no-op on the index when the barcode is included but unchanged', async () => {
        const product = await createProduct(makeProductInput({barCode: 'same-code'}));
        await expect(updateProduct(product.id, {barCode: 'same-code', price: 5})).resolves.toBeUndefined();

        const claim = await get(ref(state.db as Database, 'barcodes/same-code'));
        expect(claim.val()).toBe(product.id);
    });
});

describe('deleteProduct', () => {
    it('releases the barcode claim so it can be reused', async () => {
        const product = await createProduct(makeProductInput({barCode: 'to-delete'}));
        await deleteProduct(product.id);

        const claim = await get(ref(state.db as Database, 'barcodes/to-delete'));
        expect(claim.exists()).toBe(false);

        await expect(createProduct(makeProductInput({barCode: 'to-delete'}))).resolves.toBeDefined();
    });

    it('removes the product itself', async () => {
        const product = await createProduct(makeProductInput());
        await deleteProduct(product.id);

        const products = await getProducts();
        expect(products.find((p) => p.id === product.id)).toBeUndefined();
    });
});

describe('incrementProductQuantity — transactional correctness under concurrency', () => {
    it('sums many concurrent increments correctly instead of losing updates', async () => {
        const product = await createProduct(makeProductInput({quantity: 0}));

        // 20 concurrent +1 restocks — a naive read-then-write (not a real
        // transaction) would lose most of these under real concurrency.
        await Promise.all(Array.from({length: 20}, () => incrementProductQuantity(product.id, 1)));

        const qtySnap = await get(ref(state.db as Database, `products/${product.id}/quantity`));
        expect(qtySnap.val()).toBe(20);
    });

    it('handles a mix of concurrent increments and decrements correctly', async () => {
        const product = await createProduct(makeProductInput({quantity: 50}));

        await Promise.all([
            ...Array.from({length: 10}, () => incrementProductQuantity(product.id, 5)),
            ...Array.from({length: 10}, () => incrementProductQuantity(product.id, -3)),
        ]);

        // 50 + (10*5) + (10*-3) = 50 + 50 - 30 = 70
        const qtySnap = await get(ref(state.db as Database, `products/${product.id}/quantity`));
        expect(qtySnap.val()).toBe(70);
    });
});