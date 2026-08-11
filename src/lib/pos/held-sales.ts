import type {CartItem} from '@/types/cart';
import type {HeldSale} from '@/types/held-sale';

const STORAGE_KEY = 'store-console:held-sales';

function read(): HeldSale[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as HeldSale[]) : [];
    } catch {
        return [];
    }
}

function write(sales: HeldSale[]) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
    window.dispatchEvent(new Event('store-console:held-sales-changed'));
}

export function getHeldSales(): HeldSale[] {
    return read();
}

/** Parks the current cart under a label so a cashier can serve another
 * customer and come back to it — device-local, deliberately not synced to
 * Firebase, since it's mid-transaction scratch state, not a completed sale. */
export function holdSale(items: CartItem[], label: string): HeldSale {
    const entry: HeldSale = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        label,
        items,
        heldAt: new Date().toISOString(),
    };
    write([entry, ...read()]);
    return entry;
}

export function removeHeldSale(id: string) {
    write(read().filter((s) => s.id !== id));
}