import {child, get, push, ref, remove, set} from 'firebase/database';
import {FirebaseUnavailableError, getDb} from './client';
import type {Sale, SaleInput} from '@/types/sale';

const PATH = 'sale';

export async function getSales(): Promise<Sale[]> {
    try {
        const snapshot = await get(ref(getDb(), PATH));
        const value = snapshot.val() as Record<string, Omit<Sale, 'id'>> | null;
        if (!value) return [];
        return Object.entries(value)
            .map(([id, raw]) => ({id, ...raw}))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function getSale(id: string): Promise<Sale | null> {
    try {
        const snapshot = await get(child(ref(getDb(), PATH), id));
        if (!snapshot.exists()) return null;
        return {id, ...(snapshot.val() as Omit<Sale, 'id'>)};
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