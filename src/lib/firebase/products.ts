import { ref, get, set, push, update, remove, child, runTransaction } from 'firebase/database';
import {FirebaseUnavailableError, getDb} from './client';
import type {PackageOption, Product, ProductInput, SaleUnit, WeightUnit} from '@/types/product';

const PATH = 'products';
const BARCODE_PATH = 'barcodes';

export class DuplicateBarcodeError extends Error {
    constructor(public barcode: string) {
        super(`Barcode "${barcode}" is already used by another product.`);
        this.name = 'DuplicateBarcodeError';
    }
}

type RawProduct = Omit<Product, 'id' | 'barCode' | 'saleUnit'> & {
    barCode: string | number;
    saleUnit?: SaleUnit;
    weightUnit?: WeightUnit;
    packageOption?: PackageOption | null;
};

function normalizeProduct(id: string, raw: RawProduct): Product {
    return {
        id,
        name: raw.name,
        price: Number(raw.price) || 0,
        purchasePrice: Number(raw.purchasePrice) || 0,
        quantity: Number(raw.quantity) || 0,
        barCode: String(raw.barCode ?? '').trim(),
        // Legacy records predate saleUnit entirely — default them to plain pieces.
        saleUnit: raw.saleUnit === 'weight' ? 'weight' : 'piece',
        weightUnit: raw.weightUnit === 'g' ? 'g' : 'kg',
        packageOption: raw.packageOption ?? null,
        createdAt: raw.createdAt ?? new Date(0).toISOString(),
        updatedAt: raw.updatedAt ?? new Date(0).toISOString(),
    };
}

/** Always writes a concrete saleUnit/weightUnit/packageOption — never `undefined`,
 * which the Realtime Database SDK rejects outright inside set()/update(). */
function buildPayload(product: ProductInput, now: string) {
    return {
        name: product.name,
        barCode: String(product.barCode).trim(),
        price: product.price,
        purchasePrice: product.purchasePrice,
        quantity: product.quantity,
        saleUnit: product.saleUnit ?? 'piece',
        weightUnit: product.weightUnit ?? 'kg',
        packageOption: product.packageOption ?? null,
        updatedAt: now,
    };
}

export async function getProducts(): Promise<Product[]> {
    try {
        const snapshot = await get(ref(getDb(), PATH));
        const value = snapshot.val() as Record<string, RawProduct> | null;
        if (!value) return [];
        return Object.entries(value).map(([id, raw]) => normalizeProduct(id, raw));
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function getProduct(id: string): Promise<Product | null> {
    try {
        const snapshot = await get(child(ref(getDb(), PATH), id));
        if (!snapshot.exists()) return null;
        return normalizeProduct(id, snapshot.val() as RawProduct);
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function createProduct(product: ProductInput): Promise<Product> {
    try {
        const newRef = push(ref(getDb(), PATH));
        const now = new Date().toISOString();
        const payload = {...buildPayload(product, now), createdAt: now};

        await update(ref(getDb()), {
            [`${PATH}/${newRef.key}`]: payload,
            [`${BARCODE_PATH}/${payload.barCode}`]: newRef.key,
        });

        return {id: newRef.key as string, ...payload} as Product;
    } catch (error) {
        if ((error as { code?: string })?.code === 'PERMISSION_DENIED') {
            throw new DuplicateBarcodeError(product.barCode);
        }
        throw new FirebaseUnavailableError(error);
    }
}

/** Writes many products (and claims their barcodes) in a single multi-path
 * update instead of one request per row. If any barcode collides — either
 * with another product already in the catalog, or with another row in this
 * same import — the entire batch is rejected atomically rather than
 * partially importing. */
export async function bulkCreateProducts(products: ProductInput[]): Promise<Product[]> {
    try {
        const now = new Date().toISOString();
        const updates: Record<string, unknown> = {};
        const created: Product[] = [];
        const seenInThisBatch = new Set<string>();

        for (const product of products) {
            const newRef = push(ref(getDb(), PATH));
            const payload = {...buildPayload(product, now), createdAt: now};

            if (seenInThisBatch.has(payload.barCode)) {
                throw new DuplicateBarcodeError(payload.barCode);
            }
            seenInThisBatch.add(payload.barCode);

            updates[`${PATH}/${newRef.key}`] = payload;
            updates[`${BARCODE_PATH}/${payload.barCode}`] = newRef.key;
            created.push({id: newRef.key as string, ...payload} as Product);
        }

        await update(ref(getDb()), updates);
        return created;
    } catch (error) {
        if (error instanceof DuplicateBarcodeError) throw error;
        if ((error as { code?: string })?.code === 'PERMISSION_DENIED') {
            throw new DuplicateBarcodeError('one or more rows collide with an existing product');
        }
        throw new FirebaseUnavailableError(error);
    }
}

export async function updateProduct(id: string, product: Partial<ProductInput>): Promise<void> {
    const payload: Record<string, unknown> = {...product, updatedAt: new Date().toISOString()};
    if (typeof product.barCode !== 'undefined') {
        payload.barCode = String(product.barCode).trim();
    }
    if (typeof product.packageOption !== 'undefined') {
        payload.packageOption = product.packageOption ?? null;
    }

    try {
        // Only the barcode-change path needs the extra read + multi-path
        // dance below (to release the old claim and take the new one
        // atomically with the product update); every other edit stays a
        // plain partial update, unchanged from before.
        if (typeof payload.barCode === 'string') {
            const newBarCode = payload.barCode as string;
            const currentSnapshot = await get(child(ref(getDb(), PATH), `${id}/barCode`));
            const oldBarCode = currentSnapshot.exists() ? String(currentSnapshot.val()) : null;

            if (oldBarCode !== newBarCode) {
                const updates: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(payload)) {
                    updates[`${PATH}/${id}/${key}`] = value;
                }
                if (oldBarCode) {
                    updates[`${BARCODE_PATH}/${oldBarCode}`] = null;
                }
                updates[`${BARCODE_PATH}/${newBarCode}`] = id;

                await update(ref(getDb()), updates);
                return;
            }
        }

        await update(child(ref(getDb(), PATH), id), payload);
    } catch (error) {
        if ((error as { code?: string })?.code === 'PERMISSION_DENIED') {
            throw new DuplicateBarcodeError(String(payload.barCode));
        }
        throw new FirebaseUnavailableError(error);
    }
}

export async function deleteProduct(id: string): Promise<void> {
    try {
        const barCodeSnapshot = await get(child(ref(getDb(), PATH), `${id}/barCode`));
        const barCode = barCodeSnapshot.exists() ? String(barCodeSnapshot.val()) : null;

        const updates: Record<string, unknown> = {
            [`${PATH}/${id}`]: null,
        };
        if (barCode) {
            updates[`${BARCODE_PATH}/${barCode}`] = null; // release the claim so it can be reused
        }

        await update(ref(getDb()), updates);
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function incrementProductQuantity(id: string, delta: number): Promise<number> {
    try {
        const result = await runTransaction(ref(getDb(), `${PATH}/${id}/quantity`), (current) => (current ?? 0) + delta);
        if (!result.committed) throw new Error('Transaction did not commit');
        return (result.snapshot.val() as number) ?? 0;
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}