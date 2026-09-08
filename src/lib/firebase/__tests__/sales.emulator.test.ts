import {afterAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {get, ref} from 'firebase/database';
import type {Database} from 'firebase/database';
import {clearData, staffDb, teardownTestEnv} from './emulator-helpers';
import type * as ClientModule from '../client';

const state = vi.hoisted(() => ({db: null as Database | null}));

// vi.mock calls are hoisted above every import in this file by Vitest's
// transform, regardless of where they appear in source order — so the
// static imports of sales.ts/products.ts below are already pointed at the
// emulator by the time they run.
vi.mock('../client', async (importOriginal) => {
    const actual = await importOriginal<typeof ClientModule>();

    return {
        ...actual,
        getDb: () => state.db as Database,
    };
});

import {Product, ProductInput} from "../../../types/product";
import {SaleInput} from "../../../types/sale";
import {createProduct} from "../products";
import {computeStockDeltas} from "../../utils/stock";
import {createSale, RefundExceedsAvailableError, refundSale, SaleNotFoundError} from "../sales";


async function seedProduct(overrides: Partial<ProductInput> = {}): Promise<Product> {
    const input: ProductInput = {
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
    return createProduct(input);
}

function makeSaleInput(overrides: Partial<SaleInput> = {}): SaleInput {
    return {
        date: new Date().toISOString(),
        products: [],
        totalPrice: 0,
        totalQuantity: 0,
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

describe('createSale — atomic stock decrement (the original P0 bug)', () => {
    it('decrements product stock alongside the sale write', async () => {
        const product = await seedProduct({quantity: 10});

        const sale = makeSaleInput({
            products: [
                {
                    idProduct: product.id,
                    name: product.name,
                    barCode: product.barCode,
                    price: 10,
                    purchasePrice: 5,
                    quantity: 3,
                    date: new Date().toISOString(),
                },
            ],
            totalPrice: 30,
            totalQuantity: 3,
        });
        const stockDeltas = computeStockDeltas(
            [{idProduct: product.id, quantity: 3, mode: 'piece'}],
            [product],
            -1
        );

        const created = await createSale(sale, stockDeltas);
        expect(created.id).toBeTruthy();

        const qtySnap = await get(ref(state.db as Database, `products/${product.id}/quantity`));
        expect(qtySnap.val()).toBe(7);
    });

    it('decrements a package line by pieces (quantity * piecesPerPackage), not by package count', async () => {
        const product = await seedProduct({
            quantity: 100,
            packageOption: {piecesPerPackage: 24, packagePrice: 20},
        });

        const sale = makeSaleInput({
            products: [
                {
                    idProduct: product.id,
                    name: product.name,
                    barCode: product.barCode,
                    price: 20,
                    purchasePrice: 15,
                    quantity: 2,
                    mode: 'package',
                    date: new Date().toISOString(),
                },
            ],
            totalPrice: 40,
            totalQuantity: 2,
        });
        const stockDeltas = computeStockDeltas(
            [{idProduct: product.id, quantity: 2, mode: 'package'}],
            [product],
            -1
        );

        await createSale(sale, stockDeltas);

        const qtySnap = await get(ref(state.db as Database, `products/${product.id}/quantity`));
        expect(qtySnap.val()).toBe(100 - 2 * 24);
    });

    it('is rejected atomically — including the sale record itself — when it would take stock negative', async () => {
        const product = await seedProduct({quantity: 2});

        const sale = makeSaleInput({
            products: [
                {
                    idProduct: product.id,
                    name: product.name,
                    barCode: product.barCode,
                    price: 10,
                    purchasePrice: 5,
                    quantity: 5,
                    date: new Date().toISOString(),
                },
            ],
            totalPrice: 50,
            totalQuantity: 5,
        });
        const stockDeltas = computeStockDeltas(
            [{idProduct: product.id, quantity: 5, mode: 'piece'}],
            [product],
            -1
        );

        await expect(createSale(sale, stockDeltas)).rejects.toThrow();

        // Neither the stock decrement NOR the sale record should have
        // landed — proving the multi-path update was rejected as a whole,
        // not partially (the .validate rule on quantity >= 0 is what
        // rejects it; this is what Fix #1 + Fix #3 combined actually buy
        // you server-side).
        const qtySnap = await get(ref(state.db as Database, `products/${product.id}/quantity`));
        expect(qtySnap.val()).toBe(2);

        const salesSnap = await get(ref(state.db as Database, 'sale'));
        expect(salesSnap.exists()).toBe(false);
    });

    it('allows a sale that takes stock exactly to zero', async () => {
        const product = await seedProduct({quantity: 3});
        const sale = makeSaleInput({
            products: [
                {
                    idProduct: product.id,
                    name: product.name,
                    barCode: product.barCode,
                    price: 10,
                    purchasePrice: 5,
                    quantity: 3,
                    date: new Date().toISOString(),
                },
            ],
            totalPrice: 30,
            totalQuantity: 3,
        });
        const stockDeltas = computeStockDeltas(
            [{idProduct: product.id, quantity: 3, mode: 'piece'}],
            [product],
            -1
        );

        await expect(createSale(sale, stockDeltas)).resolves.toBeDefined();
        const qtySnap = await get(ref(state.db as Database, `products/${product.id}/quantity`));
        expect(qtySnap.val()).toBe(0);
    });
});

describe('refundSale — atomic restock + over-refund protection (the other original P0 bug + the race fix)', () => {
    it('restocks the product when a refund is processed', async () => {
        const product = await seedProduct({quantity: 10});
        const sale = makeSaleInput({
            products: [
                {
                    idProduct: product.id,
                    name: product.name,
                    barCode: product.barCode,
                    price: 10,
                    purchasePrice: 5,
                    quantity: 3,
                    date: new Date().toISOString(),
                },
            ],
            totalPrice: 30,
            totalQuantity: 3,
        });
        const saleStockDeltas = computeStockDeltas(
            [{idProduct: product.id, quantity: 3, mode: 'piece'}],
            [product],
            -1
        );
        const created = await createSale(sale, saleStockDeltas);

        const refundStockDeltas = computeStockDeltas(
            [{idProduct: product.id, quantity: 2, mode: 'piece'}],
            [product],
            1
        );
        await refundSale(
            created.id,
            {
                date: new Date().toISOString(),
                amount: 20,
                lines: [{idProduct: product.id, name: product.name, quantity: 2, price: 10}],
            },
            refundStockDeltas
        );

        // 10 - 3 (sold) + 2 (refunded) = 9
        const qtySnap = await get(ref(state.db as Database, `products/${product.id}/quantity`));
        expect(qtySnap.val()).toBe(9);
    });

    it('rejects a refund that exceeds what was actually sold', async () => {
        const product = await seedProduct({quantity: 10});
        const sale = makeSaleInput({
            products: [
                {
                    idProduct: product.id,
                    name: product.name,
                    barCode: product.barCode,
                    price: 10,
                    purchasePrice: 5,
                    quantity: 2,
                    date: new Date().toISOString(),
                },
            ],
            totalPrice: 20,
            totalQuantity: 2,
        });
        const created = await createSale(
            sale,
            computeStockDeltas([{idProduct: product.id, quantity: 2, mode: 'piece'}], [product], -1)
        );

        await expect(
            refundSale(
                created.id,
                {
                    date: new Date().toISOString(),
                    amount: 30,
                    lines: [{idProduct: product.id, name: product.name, quantity: 3, price: 10}], // only 2 were sold
                },
                []
            )
        ).rejects.toThrow(RefundExceedsAvailableError);
    });

    it('allows a second partial refund as long as the combined total stays within what was sold', async () => {
        const product = await seedProduct({quantity: 10});
        const sale = makeSaleInput({
            products: [
                {
                    idProduct: product.id,
                    name: product.name,
                    barCode: product.barCode,
                    price: 10,
                    purchasePrice: 5,
                    quantity: 5,
                    date: new Date().toISOString(),
                },
            ],
            totalPrice: 50,
            totalQuantity: 5,
        });
        const created = await createSale(
            sale,
            computeStockDeltas([{idProduct: product.id, quantity: 5, mode: 'piece'}], [product], -1)
        );

        await refundSale(created.id, {
            date: new Date().toISOString(),
            amount: 20,
            lines: [{idProduct: product.id, name: product.name, quantity: 2, price: 10}],
        }, []);

        // 2 already refunded + 3 more = 5, exactly what was sold — should succeed.
        await expect(
            refundSale(created.id, {
                date: new Date().toISOString(),
                amount: 30,
                lines: [{idProduct: product.id, name: product.name, quantity: 3, price: 10}],
            }, [])
        ).resolves.toBeDefined();
    });

    it('rejects a second refund that would push the combined total over what was sold', async () => {
        const product = await seedProduct({quantity: 10});
        const sale = makeSaleInput({
            products: [
                {
                    idProduct: product.id,
                    name: product.name,
                    barCode: product.barCode,
                    price: 10,
                    purchasePrice: 5,
                    quantity: 5,
                    date: new Date().toISOString(),
                },
            ],
            totalPrice: 50,
            totalQuantity: 5,
        });
        const created = await createSale(
            sale,
            computeStockDeltas([{idProduct: product.id, quantity: 5, mode: 'piece'}], [product], -1)
        );

        await refundSale(created.id, {
            date: new Date().toISOString(),
            amount: 20,
            lines: [{idProduct: product.id, name: product.name, quantity: 2, price: 10}],
        }, []);

        // 2 already refunded + 4 more = 6, exceeds the 5 sold — must reject.
        await expect(
            refundSale(created.id, {
                date: new Date().toISOString(),
                amount: 40,
                lines: [{idProduct: product.id, name: product.name, quantity: 4, price: 10}],
            }, [])
        ).rejects.toThrow(RefundExceedsAvailableError);
    });

    it('prevents two concurrent refunds from jointly over-refunding a sale', async () => {
        const product = await seedProduct({quantity: 10});
        const sale = makeSaleInput({
            products: [
                {
                    idProduct: product.id,
                    name: product.name,
                    barCode: product.barCode,
                    price: 10,
                    purchasePrice: 5,
                    quantity: 3,
                    date: new Date().toISOString(),
                },
            ],
            totalPrice: 30,
            totalQuantity: 3,
        });
        const created = await createSale(
            sale,
            computeStockDeltas([{idProduct: product.id, quantity: 3, mode: 'piece'}], [product], -1)
        );

        const refundAttempt = () =>
            refundSale(
                created.id,
                {
                    date: new Date().toISOString(),
                    amount: 30,
                    // Each concurrent attempt tries to refund ALL 3 sold units.
                    lines: [{idProduct: product.id, name: product.name, quantity: 3, price: 10}],
                },
                []
            );

        const results = await Promise.allSettled([refundAttempt(), refundAttempt()]);
        const succeeded = results.filter((r) => r.status === 'fulfilled');
        const failed = results.filter((r) => r.status === 'rejected');

        // Exactly one of the two concurrent full refunds should win; the
        // other must be rejected by the transaction re-validating against
        // live server data on retry — this is the fix for the TOCTOU race
        // found in the original audit.
        expect(succeeded).toHaveLength(1);
        expect(failed).toHaveLength(1);

        const refundsSnap = await get(ref(state.db as Database, `sale/${created.id}/refunds`));
        const refunds = refundsSnap.exists()
            ? Object.values(refundsSnap.val() as Record<string, {lines: {quantity: number}[]}>)
            : [];
        const totalRefundedQty = refunds.reduce(
            (sum, r) => sum + r.lines.reduce((s, l) => s + l.quantity, 0),
            0
        );
        expect(totalRefundedQty).toBe(3); // never more than what was actually sold
    });

    it('rejects refunding a sale that does not exist, with a dedicated not-found error', async () => {
        await expect(
            refundSale(
                'no-such-sale',
                {
                    date: new Date().toISOString(),
                    amount: 10,
                    lines: [{idProduct: 'p1', name: 'Widget', quantity: 1, price: 10}],
                },
                []
            )
        ).rejects.toThrow(SaleNotFoundError);
    });
});