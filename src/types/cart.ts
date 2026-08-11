export type CartLineMode = 'piece' | 'weight' | 'package';

export interface CartItem {
    /** `${productId}::${mode}` — lets one product occupy separate cart lines
     * for, say, "sold by the piece" and "sold as a full package" at once. */
    lineId: string;
    productId: string;
    name: string;
    barcode: string;
    mode: CartLineMode;
    /** 'kg' | 'g' for weight lines, 'pkg of N' for package lines, unset for plain pieces. */
    unitLabel?: string;
    /** Price per unit of `mode` (per piece, per weightUnit, or per package). */
    price: number;
    purchasePrice: number;
    /** Piece count, weight amount, or package count, depending on `mode`. */
    quantity: number;
}

export interface BarcodeScanResult {
    rawValue: string;
    format?: string;
}