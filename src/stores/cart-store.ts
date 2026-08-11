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
    /** Fast path for a plain piece-only product (no weight, no package option) — instant add, +1 on rescan. */
    addProduct: (product: Product) => void;
    /** Generic path for weight/package lines (and usable for plain pieces too). */
    addLine: (input: AddLineInput) => void;
    incrementItem: (lineId: string) => void;
    decrementItem: (lineId: string) => void;
    setQuantity: (lineId: string, quantity: number) => void;
    removeItem: (lineId: string) => void;
    clear: () => void;
    total: () => number;
    totalQuantity: () => number;
}

function lineIdFor(productId: string, mode: CartLineMode) {
    return `${productId}::${mode}`;
}

/** Weight lines step by a sensible amount instead of a flat 1 (meaningless for kg/g); piece/package lines step by 1. */
function stepFor(item: CartItem): number {
    if (item.mode !== 'weight') return 1;
    return item.unitLabel === 'g' ? 50 : 0.1;
}

/** Keeps weight amounts to 3 decimal places instead of drifting from float math; piece/package counts stay whole numbers. */
function roundQuantity(value: number, mode: CartLineMode): number {
    if (mode !== 'weight') return Math.round(value);
    return Math.round(value * 1000) / 1000;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],

    addProduct: (product) => {
        get().addLine({product, mode: 'piece', quantity: 1, unitPrice: product.price});
    },

    addLine: ({product, mode, quantity, unitPrice, unitLabel}) =>
        set((state) => {
            const lineId = lineIdFor(product.id, mode);
            const existing = state.items.find((i) => i.lineId === lineId);
            if (existing) {
                return {
                    items: state.items.map((i) =>
                        i.lineId === lineId ? {...i, quantity: roundQuantity(i.quantity + quantity, mode)} : i
                    ),
                };
            }
            const newItem: CartItem = {
                lineId,
                productId: product.id,
                name: product.name,
                barcode: product.barCode,
                mode,
                unitLabel,
                price: unitPrice,
                purchasePrice: product.purchasePrice,
                quantity: roundQuantity(quantity, mode),
            };
            return {items: [newItem, ...state.items]};
        }),

    incrementItem: (lineId) =>
        set((state) => ({
            items: state.items.map((i) =>
                i.lineId === lineId ? {...i, quantity: roundQuantity(i.quantity + stepFor(i), i.mode)} : i
            ),
        })),

    decrementItem: (lineId) =>
        set((state) => ({
            items: state.items
                .map((i) => (i.lineId === lineId ? {
                    ...i,
                    quantity: roundQuantity(i.quantity - stepFor(i), i.mode)
                } : i))
                .filter((i) => i.quantity > 0),
        })),

    setQuantity: (lineId, quantity) =>
        set((state) => ({
            items:
                quantity <= 0
                    ? state.items.filter((i) => i.lineId !== lineId)
                    : state.items.map((i) => (i.lineId === lineId ? {
                        ...i,
                        quantity: roundQuantity(quantity, i.mode)
                    } : i)),
        })),

    removeItem: (lineId) => set((state) => ({items: state.items.filter((i) => i.lineId !== lineId)})),

    clear: () => set({items: []}),

    total: () => calculateCartTotal(get().items),

    totalQuantity: () => get().items.reduce((sum, i) => sum + (i.mode === 'weight' ? 1 : i.quantity), 0),
}));