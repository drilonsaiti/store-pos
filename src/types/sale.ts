import type {CartLineMode} from './cart';

export interface SaleLineItem {
    idProduct: string;
    name: string;
    barCode: string;
    price: number;
    purchasePrice: number;
    quantity: number;
    date: string;
    mode?: CartLineMode;
    unitLabel?: string;
}

export interface Sale {
    id: string;
    date: string;
    products: SaleLineItem[];
    totalPrice: number;
    totalQuantity: number;
}

export type SaleInput = Omit<Sale, 'id'>;