import {create} from 'zustand';
import type {CartItem, CartLineMode} from '@/types/cart';
import type {Product} from '@/types/product';
import {calculateCartTotal} from '@/lib/utils/currency';

interface AddLineInput {
    product: Product;
    mode: CartLineMode;
    /** Amount to ADD (pieces count, weight amount, or package count) — merges into an existing matching line. */
    quantity: number;
    unitPrice: number;
    unitLabel?: string;
}

interface CartState {
    items: CartItem[];

    /** Fast path for a plain piece-only product — instant add, +1 on rescan. */
    addProduct: (product: Product) => void;

    /** Generic path for weight/package lines (and usable for plain pieces too). */
    addLine: (input: AddLineInput) => void;

    /**
     * Accepts either a lineId (e.g. "p1::piece") or a productId (e.g. "p1").
     * Product IDs are supported for backwards compatibility with the simple
     * piece-only cart API.
     */
    incrementItem: (id: string) => void;
    decrementItem: (id: string) => void;
    setQuantity: (id: string, quantity: number) => void;
    removeItem: (id: string) => void;

    clear: () => void;
    loadItems: (items: CartItem[]) => void;
    total: () => number;
    totalQuantity: () => number;
}

function lineIdFor(productId: string, mode: CartLineMode) {
    return `${productId}::${mode}`;
}

/**
 * Resolves an identifier to the appropriate cart line(s).
 *
 * A lineId identifies exactly one line:
 *   p1::piece
 *
 * A productId identifies the product:
 *   p1
 *
 * For productId operations, the first matching line is used. This preserves
 * the old API while allowing multiple modes for the same product.
 */
function matchesItem(item: CartItem, id: string): boolean {
    return item.lineId === id || item.productId === id;
}

/** Weight lines step by a sensible amount instead of a flat 1. */
function stepFor(item: CartItem): number {
    if (item.mode !== 'weight') return 1;
    return item.unitLabel === 'g' ? 50 : 0.1;
}

/**
 * Keeps weight amounts to 3 decimal places instead of drifting from float
 * math; piece/package counts stay whole numbers.
 */
function roundQuantity(value: number, mode: CartLineMode): number {
    if (mode !== 'weight') return Math.round(value);
    return Math.round(value * 1000) / 1000;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],

    addProduct: (product) => {
        get().addLine({
            product,
            mode: 'piece',
            quantity: 1,
            unitPrice: product.price,
        });
    },

    addLine: ({product, mode, quantity, unitPrice, unitLabel}) =>
        set((state) => {
            const lineId = lineIdFor(product.id, mode);
            const existing = state.items.find((i) => i.lineId === lineId);

            if (existing) {
                return {
                    items: state.items.map((i) =>
                        i.lineId === lineId
                            ? {
                                  ...i,
                                  quantity: roundQuantity(
                                      i.quantity + quantity,
                                      mode
                                  ),
                              }
                            : i
                    ),
                };
            }

            const newItem: CartItem = {
                lineId,
                productId: product.id,
                name: product.name,
                barcode: product.barCode,
                mode,
                price: unitPrice,
                purchasePrice: product.purchasePrice,
                quantity: roundQuantity(quantity, mode),
                ...(unitLabel ? {unitLabel} : {}),
            };

            return {
                items: [newItem, ...state.items],
            };
        }),

    incrementItem: (id) =>
        set((state) => {
            const target = state.items.find((i) => matchesItem(i, id));

            if (!target) {
                return state;
            }

            return {
                items: state.items.map((i) =>
                    i.lineId === target.lineId
                        ? {
                              ...i,
                              quantity: roundQuantity(
                                  i.quantity + stepFor(i),
                                  i.mode
                              ),
                          }
                        : i
                ),
            };
        }),

    decrementItem: (id) =>
        set((state) => {
            const target = state.items.find((i) => matchesItem(i, id));

            if (!target) {
                return state;
            }

            return {
                items: state.items
                    .map((i) =>
                        i.lineId === target.lineId
                            ? {
                                  ...i,
                                  quantity: roundQuantity(
                                      i.quantity - stepFor(i),
                                      i.mode
                                  ),
                              }
                            : i
                    )
                    .filter((i) => i.quantity > 0),
            };
        }),

    setQuantity: (id, quantity) =>
        set((state) => {
            const target = state.items.find((i) => matchesItem(i, id));

            if (!target) {
                return state;
            }

            if (quantity <= 0) {
                return {
                    items: state.items.filter(
                        (i) => i.lineId !== target.lineId
                    ),
                };
            }

            return {
                items: state.items.map((i) =>
                    i.lineId === target.lineId
                        ? {
                              ...i,
                              quantity: roundQuantity(
                                  quantity,
                                  i.mode
                              ),
                          }
                        : i
                ),
            };
        }),

    removeItem: (id) =>
        set((state) => {
            const target = state.items.find((i) => matchesItem(i, id));

            if (!target) {
                return state;
            }

            return {
                items: state.items.filter(
                    (i) => i.lineId !== target.lineId
                ),
            };
        }),

    clear: () => set({items: []}),

    loadItems: (items) => set({items}),

    total: () => calculateCartTotal(get().items),

    totalQuantity: () =>
        get().items.reduce(
            (sum, i) =>
                sum + (i.mode === 'weight' ? 1 : i.quantity),
            0
        ),
}));

