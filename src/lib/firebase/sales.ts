import {child, get, increment, push, ref, remove, runTransaction, set, update} from 'firebase/database';
import {FirebaseUnavailableError, getDb} from './client';
import type {RawSale, Refund, Sale, SaleInput} from '@/types/sale';
import {normalizeSale} from "@/lib/utils/refund";
import type {StockDelta} from '@/lib/utils/stock';

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

export async function createSale(sale: SaleInput, stockDeltas: StockDelta[] = []): Promise<Sale> {
    try {
        const newRef = push(ref(getDb(), PATH));

        const updates: Record<string, unknown> = {
            [`${PATH}/${newRef.key}`]: sale,
        };

        for (const {productId, delta} of stockDeltas) {
            if (delta === 0) continue;
            updates[`products/${productId}/quantity`] = increment(delta);
        }

        await update(ref(getDb()), updates);

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

const QUANTITY_EPSILON = 1e-6;

/** How much of a given sale line is already refunded, read straight off the
 * server's current (not the client's cached) sale record. Mirrors
 * getRefundedQuantity() in lib/utils/refund.ts, but works against the raw
 * transaction snapshot instead of the normalized Sale type. */
function refundedQuantityFromRaw(
    current: RawSale,
    idProduct: string,
    mode: string | undefined
): number {
    const refunds = current.refunds ? Object.values(current.refunds) : [];
    return refunds.reduce((sum, r) => {
        const matching = (r.lines ?? []).filter(
            (l) => l.idProduct === idProduct && (l.mode ?? 'piece') === (mode ?? 'piece')
        );
        return sum + matching.reduce((s, l) => s + l.quantity, 0);
    }, 0);
}

export class RefundExceedsAvailableError extends Error {
    constructor() {
        super('This refund exceeds what is still refundable on this sale — it may have just been refunded elsewhere.');
        this.name = 'RefundExceedsAvailableError';
    }
}

/**
 * Writes the refund record inside a transaction on the sale node itself, so
 * the "how much is left to refund" check is re-validated against the
 * server's live data (and retried by the SDK on conflict) instead of the
 * client's possibly-stale snapshot — closing the race where two concurrent
 * refunds could both pass a client-side cap check and jointly over-refund
 * a sale. Stock is restocked in a separate update only after the refund
 * transaction actually commits.
 */
export async function refundSale(
    saleId: string,
    refund: Omit<Refund, 'id'>,
    stockDeltas: StockDelta[] = []
): Promise<Refund> {
    try {
        const saleRef = ref(getDb(), `${PATH}/${saleId}`);
        const newRefundRef = push(ref(getDb(), `${PATH}/${saleId}/refunds`));
        const id = newRefundRef.key as string;

        const result = await runTransaction(saleRef, (current: RawSale | null) => {
            if (current === null) return undefined; // sale doesn't exist — abort, nothing to write

            for (const line of refund.lines) {
                const soldLine = current.products.find(
                    (p) => p.idProduct === line.idProduct && (p.mode ?? 'piece') === (line.mode ?? 'piece')
                );
                const soldQuantity = soldLine?.quantity ?? 0;
                const alreadyRefunded = refundedQuantityFromRaw(current, line.idProduct, line.mode);

                if (alreadyRefunded + line.quantity > soldQuantity + QUANTITY_EPSILON) {
                    return; // exceeds what's left — abort the whole transaction
                }
            }

            return {
                ...current,
                refunds: {
                    ...(current.refunds ?? {}),
                    [id]: refund,
                },
            };
        });

        if (!result.committed) {
            throw new RefundExceedsAvailableError();
        }

        if (stockDeltas.length > 0) {
            const updates: Record<string, unknown> = {};
            for (const {productId, delta} of stockDeltas) {
                if (delta === 0) continue;
                updates[`products/${productId}/quantity`] = increment(delta);
            }
            if (Object.keys(updates).length > 0) {
                await update(ref(getDb()), updates);
            }
        }

        return {id, ...refund};
    } catch (error) {
        if (error instanceof RefundExceedsAvailableError) {
            throw error;
        }
        throw new FirebaseUnavailableError(error);
    }
}