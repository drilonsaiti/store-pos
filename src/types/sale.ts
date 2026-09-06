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

export interface RefundLine {
    idProduct: string;
    name: string;
    quantity: number;
    price: number;
    mode?: CartLineMode;
    unitLabel?: string;
}

export interface Refund {
    id: string;
    date: string;
    lines: RefundLine[];
    amount: number;
    reason?: string;
}

export interface Sale {
    id: string;
    date: string;
    products: SaleLineItem[];
    totalPrice: number;
    totalQuantity: number;
    employeeId?: string;
    employeeName?: string;
    amountReceived?: number;
    changeDue?: number;
    refunds?: Refund[];
}

export type SaleInput = Omit<Sale, 'id'>;

export type RawSale = Omit<Sale, 'id' | 'refunds'> & {
    refunds?: Record<string, Omit<Refund, 'id'>>;
};