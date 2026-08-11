import {child, get, push, ref, remove, set} from 'firebase/database';
import {FirebaseUnavailableError, getDb} from './client';
import type {RawSale, Refund, Sale, SaleInput} from '@/types/sale';
import {normalizeSale} from "@/lib/utils/refund";

const PATH = 'sale';

export async function getSales(): Promise<Sale[]> {
    try {
        const snapshot = await get(ref(getDb(), PATH));
        const value = snapshot.val() as Record<string, RawSale> | null;
        if (!value) return [];
        return Object.entries(value)
            .map(([id, raw]) => normalizeSale(id, raw))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function getSale(id: string): Promise<Sale | null> {
    try {
        const snapshot = await get(child(ref(getDb(), PATH), id));
        if (!snapshot.exists()) return null;
        return normalizeSale(id, snapshot.val() as RawSale);
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function createSale(sale: SaleInput): Promise<Sale> {
    try {
        const listRef = ref(getDb(), PATH);
        const newRef = push(listRef);
        await set(newRef, sale);
        return {id: newRef.key as string, ...sale};
    } catch (error) {
        if (error instanceof Error && /undefined in property/.test(error.message)) {
            throw error;
        }
        throw new FirebaseUnavailableError(error);
    }
}

export async function deleteSale(id: string): Promise<void> {
    try {
        await remove(child(ref(getDb(), PATH), id));
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function refundSale(
    saleId: string,
    refund: Omit<Refund, 'id'>,
    restock: Array<{ productId: string; quantityToAdd: number }>
): Promise<Refund> {
    try {
        const refundRef = push(ref(getDb(), `${PATH}/${saleId}/refunds`));
        const id = refundRef.key as string;
        await set(refundRef, refund);
        return {id, ...refund};
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}