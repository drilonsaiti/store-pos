import type {CartItem} from './cart';

export interface HeldSale {
    id: string;
    label: string;
    items: CartItem[];
    heldAt: string;
}