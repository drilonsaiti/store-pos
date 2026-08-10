export interface CartItem {
    productId: string;
    name: string;
    barcode: string;
    price: number;
    purchasePrice: number;
    quantity: number;
}

export interface BarcodeScanResult {
    rawValue: string;
    format?: string;
}
