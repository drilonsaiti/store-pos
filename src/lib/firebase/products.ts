import {child, get, push, ref, remove, set, update} from 'firebase/database';
import {FirebaseUnavailableError, getDb} from './client';
import type {PackageOption, Product, ProductInput, SaleUnit, WeightUnit} from '@/types/product';

const PATH = 'products';

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
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
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
        const listRef = ref(getDb(), PATH);
        const newRef = push(listRef);
        const now = new Date().toISOString();
        const payload = {...buildPayload(product, now), createdAt: now};
        await set(newRef, payload);
        return {id: newRef.key as string, ...payload} as Product;
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

/** Writes many products in a single multi-path update instead of one request per row. */
export async function bulkCreateProducts(products: ProductInput[]): Promise<Product[]> {
    try {
        const now = new Date().toISOString();
        const updates: Record<string, unknown> = {};
        const created: Product[] = [];
        for (const product of products) {
            const newRef = push(ref(getDb(), PATH));
            const payload = {...buildPayload(product, now), createdAt: now};
            updates[`${PATH}/${newRef.key}`] = payload;
            created.push({id: newRef.key as string, ...payload} as Product);
        }
        await update(ref(getDb()), updates);
        return created;
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function updateProduct(id: string, product: Partial<ProductInput>): Promise<void> {
    try {
        const payload: Record<string, unknown> = {...product, updatedAt: new Date().toISOString()};
        if (typeof product.barCode !== 'undefined') {
            payload.barCode = String(product.barCode).trim();
        }
        if (typeof product.packageOption !== 'undefined') {
            payload.packageOption = product.packageOption ?? null;
        }
        await update(child(ref(getDb(), PATH), id), payload);
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function deleteProduct(id: string): Promise<void> {
    try {
        await remove(child(ref(getDb(), PATH), id));
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}