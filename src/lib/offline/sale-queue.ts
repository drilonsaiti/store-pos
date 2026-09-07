import type {SaleInput} from '@/types/sale';
import type {StockDelta} from '@/lib/utils/stock';

const STORAGE_KEY = 'store-console:offline-sale-queue';

export interface QueuedSale {
    localId: string;
    sale: SaleInput;
    stockDeltas: StockDelta[];
    queuedAt: string;
}

function read(): QueuedSale[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as QueuedSale[]) : [];
    } catch {
        return [];
    }
}

function write(queue: QueuedSale[]) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event('store-console:offline-queue-changed'));
}

export function getQueuedSales(): QueuedSale[] {
    return read();
}

/** Saves a completed-but-unsynced sale locally. Called when the network is
 * down or a save attempt fails, so a cashier never loses a rung-up sale. */
export function enqueueSale(sale: SaleInput, stockDeltas: StockDelta[] = []): QueuedSale {
    const entry: QueuedSale = {
        localId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        sale,
        stockDeltas,
        queuedAt: new Date().toISOString(),
    };
    const queue = read();
    queue.push(entry);
    write(queue);
    return entry;
}

/** Removes a queued sale once it's confirmed written to Firebase. */
export function dequeueSale(localId: string) {
    write(read().filter((q) => q.localId !== localId));
}