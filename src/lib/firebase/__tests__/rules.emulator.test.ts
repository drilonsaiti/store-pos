import {afterAll, beforeEach, describe, expect, it} from 'vitest';
import {
    anonDb,
    assertFails,
    assertSucceeds,
    clearData,
    nonStaffDb,
    seed,
    staffDb,
    teardownTestEnv,
} from './emulator-helpers';

afterAll(async () => {
    await teardownTestEnv();
});

beforeEach(async () => {
    await clearData();
});

describe('products/, sale/, employees/ — auth boundary', () => {
    it('denies an unauthenticated read of products', async () => {
        const db = await anonDb();

        await assertFails(
            db.ref('products').once('value'),
        );
    });

    it('denies an unauthenticated write to products', async () => {
        const db = await anonDb();

        await assertFails(
            db.ref('products/p1').set({
                name: 'Widget',
            }),
        );
    });

    it('denies read/write for an authenticated user who is not on the staff allowlist', async () => {
        const db = await nonStaffDb();

        await assertFails(
            db.ref('products').once('value'),
        );

        await assertFails(
            db.ref('products/p1').set({
                name: 'Widget',
            }),
        );
    });

    it('allows read/write for an authenticated user who IS on the staff allowlist', async () => {
        const db = await staffDb();

        await assertSucceeds(
            db.ref('products').once('value'),
        );

        await assertSucceeds(
            db.ref('products/p1').set({
                name: 'Widget',
                barCode: '123456',
                price: 10,
                purchasePrice: 5,
                quantity: 10,
                saleUnit: 'piece',
            }),
        );
    });

    it('does not let a client read the staff allowlist itself', async () => {
        // staff/ has .read/.write: false at the top of the rules — even a
        // staff member shouldn't be able to read or edit the allowlist
        // from the client.
        const db = await staffDb();

        await assertFails(
            db.ref('staff').once('value'),
        );
    });
});

describe('products/$id — field validation', () => {
    function validProduct(overrides: Record<string, unknown> = {}) {
        return {
            name: 'Widget',
            barCode: '123456',
            price: 10,
            purchasePrice: 5,
            quantity: 10,
            saleUnit: 'piece',
            ...overrides,
        };
    }

    it('accepts a well-formed product', async () => {
        const db = await staffDb();

        await assertSucceeds(
            db.ref('products/p1').set(
                validProduct(),
            ),
        );
    });

    it('rejects a negative price', async () => {
        const db = await staffDb();

        await assertFails(
            db.ref('products/p1').set(
                validProduct({
                    price: -1,
                }),
            ),
        );
    });

    it('rejects a negative quantity', async () => {
        const db = await staffDb();

        await assertFails(
            db.ref('products/p1').set(
                validProduct({
                    quantity: -1,
                }),
            ),
        );
    });

    it('rejects a negative purchasePrice', async () => {
        const db = await staffDb();

        await assertFails(
            db.ref('products/p1').set(
                validProduct({
                    purchasePrice: -1,
                }),
            ),
        );
    });

    it('rejects a product missing a required field', async () => {
        const db = await staffDb();

        const {name, ...withoutName} = validProduct();

        void name;

        await assertFails(
            db.ref('products/p1').set(withoutName),
        );
    });

    it('rejects an invalid saleUnit value', async () => {
        const db = await staffDb();

        await assertFails(
            db.ref('products/p1').set(
                validProduct({
                    saleUnit: 'litres',
                }),
            ),
        );
    });

    it('allows a zero price/quantity (free sample / out of stock), not just positive values', async () => {
        const db = await staffDb();

        await assertSucceeds(
            db.ref('products/p1').set(
                validProduct({
                    price: 0,
                    quantity: 0,
                }),
            ),
        );
    });

    it('rejects a negative quantity when the resulting value would be below zero', async () => {
        const db = await staffDb();

        await seed(async (adminDb) => {
            await adminDb.ref('products/p1').set(
                validProduct({
                    quantity: 2,
                }),
            );
        });

        await assertFails(
            db.ref('products/p1/quantity').set(-3),
        );
    });

    it('allows a decrement that stays at or above zero', async () => {
        const db = await staffDb();

        await seed(async (adminDb) => {
            await adminDb.ref('products/p1').set(
                validProduct({
                    quantity: 5,
                }),
            );
        });

        await assertSucceeds(
            db.ref('products/p1/quantity').set(0),
        );
    });
});

describe('barcodes/$barCode — uniqueness index', () => {
    it('allows claiming a barcode that has no existing owner', async () => {
        const db = await staffDb();

        await assertSucceeds(
            db.ref('barcodes/111').set('product-a'),
        );
    });

    it('rejects claiming a barcode already owned by a different product', async () => {
        const db = await staffDb();

        await seed(async (adminDb) => {
            await adminDb
                .ref('barcodes/111')
                .set('product-a');
        });

        await assertFails(
            db.ref('barcodes/111').set('product-b'),
        );
    });

    it('allows re-writing the same owner for a barcode (idempotent claim)', async () => {
        const db = await staffDb();

        await seed(async (adminDb) => {
            await adminDb
                .ref('barcodes/111')
                .set('product-a');
        });

        await assertSucceeds(
            db.ref('barcodes/111').set('product-a'),
        );
    });

    it('allows releasing a claim (deleting it) so the barcode can be reused', async () => {
        const db = await staffDb();

        await seed(async (adminDb) => {
            await adminDb
                .ref('barcodes/111')
                .set('product-a');
        });

        await assertSucceeds(
            db.ref('barcodes/111').remove(),
        );

        await assertSucceeds(
            db.ref('barcodes/111').set('product-b'),
        );
    });
});

describe('sale/$id — field validation', () => {
    it('rejects a negative totalPrice', async () => {
        const db = await staffDb();

        await assertFails(
            db.ref('sale/s1').set({
                date: new Date().toISOString(),
                products: [],
                totalPrice: -10,
                totalQuantity: 0,
            }),
        );
    });

    it('rejects a refund line with a negative quantity', async () => {
        const db = await staffDb();

        await seed(async (adminDb) => {
            await adminDb.ref('sale/s1').set({
                date: new Date().toISOString(),
                products: [
                    {
                        idProduct: 'p1',
                        name: 'Widget',
                        price: 10,
                        quantity: 1,
                    },
                ],
                totalPrice: 10,
                totalQuantity: 1,
            });
        });

        await assertFails(
            db.ref('sale/s1/refunds/r1').set({
                date: new Date().toISOString(),
                amount: 10,
                lines: [
                    {
                        idProduct: 'p1',
                        name: 'Widget',
                        price: 10,
                        quantity: -1,
                    },
                ],
            }),
        );
    });

    it('accepts a well-formed refund', async () => {
        const db = await staffDb();

        await seed(async (adminDb) => {
            await adminDb.ref('sale/s1').set({
                date: new Date().toISOString(),
                products: [
                    {
                        idProduct: 'p1',
                        name: 'Widget',
                        price: 10,
                        quantity: 1,
                    },
                ],
                totalPrice: 10,
                totalQuantity: 1,
            });
        });

        await assertSucceeds(
            db.ref('sale/s1/refunds/r1').set({
                date: new Date().toISOString(),
                amount: 10,
                lines: [
                    {
                        idProduct: 'p1',
                        name: 'Widget',
                        price: 10,
                        quantity: 1,
                    },
                ],
            }),
        );
    });
});

describe('employees/$id — field validation', () => {
    it('accepts a valid 4-digit PIN', async () => {
        const db = await staffDb();

        await assertSucceeds(
            db.ref('employees/e1').set({
                name: 'Ana',
                active: true,
                pin: '1234',
            }),
        );
    });

    it('rejects a non-4-digit PIN', async () => {
        const db = await staffDb();

        await assertFails(
            db.ref('employees/e1').set({
                name: 'Ana',
                active: true,
                pin: '12',
            }),
        );
    });

    it('allows a null PIN (attribution-only employee with no PIN set)', async () => {
        const db = await staffDb();

        await assertSucceeds(
            db.ref('employees/e1').set({
                name: 'Ana',
                active: true,
                pin: null,
            }),
        );
    });
});
