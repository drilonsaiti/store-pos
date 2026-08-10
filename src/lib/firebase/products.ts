import {child, get, push, ref, remove, set, update,} from 'firebase/database';
import {FirebaseUnavailableError, getDb} from './client';
import type {Product, ProductInput} from '@/types/product';

const PATH = 'products';

/**
 * Raw shape as stored in the existing Realtime Database. The legacy app wrote
 * barCode as a number in some records — we normalize to string on the way out
 * so the rest of the app never has to think about it.
 */
type RawProduct = Omit<Product, 'id' | 'barCode'> & { barCode: string | number };

function normalizeProduct(id: string, raw: RawProduct): Product {
    return {
        id,
        name: raw.name,
        price: Number(raw.price) || 0,
        purchasePrice: Number(raw.purchasePrice) || 0,
        quantity: Number(raw.quantity) || 0,
        barCode: String(raw.barCode ?? '').trim(),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
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
        const payload = {...product, barCode: String(product.barCode).trim(), createdAt: now, updatedAt: now};
        await set(newRef, payload);
        return {id: newRef.key as string, ...payload};
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


export async function bulkCreateProducts(products: ProductInput[]): Promise<Product[]> {
    try {
        const now = new Date().toISOString();
        const updates: Record<string, unknown> = {};
        const created: Product[] = [];
        for (const product of products) {
            const newRef = push(ref(getDb(), PATH));
            const payload = {...product, barCode: String(product.barCode).trim(), createdAt: now, updatedAt: now};
            updates[`${PATH}/${newRef.key}`] = payload;
            created.push({id: newRef.key as string, ...payload});
        }
        await update(ref(getDb()), updates);
        return created;
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}