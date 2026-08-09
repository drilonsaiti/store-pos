import { create } from 'zustand';
import type { CartItem } from '@/types/cart';
import type { Product } from '@/types/product';
import { calculateCartTotal } from '@/lib/utils/currency';

interface CartState {
  items: CartItem[];
  addProduct: (product: Product) => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  total: () => number;
  totalQuantity: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addProduct: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        barcode: product.barCode,
        price: product.price,
        purchasePrice: product.purchasePrice,
        quantity: 1,
      };
      return { items: [newItem, ...state.items] };
    }),

  incrementItem: (productId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
      ),
    })),

  decrementItem: (productId) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    })),

  setQuantity: (productId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.productId !== productId)
          : state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    })),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

  clear: () => set({ items: [] }),

  total: () => calculateCartTotal(get().items),

  totalQuantity: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
