export type SaleUnit = 'piece' | 'weight';
export type WeightUnit = 'kg' | 'g';

export interface PackageOption {
    piecesPerPackage: number;
    packagePrice: number;
}

export interface Product {
    id: string;
    name: string;
    /** Always a string. Never coerce to number — barcodes can carry leading zeroes. */
    barCode: string;
    /** Price per piece, or price per weightUnit when saleUnit is 'weight'. */
    price: number;
    purchasePrice: number;
    /** Stock count (pieces) or stock amount (in weightUnit) depending on saleUnit. */
    quantity: number;
    saleUnit: SaleUnit;
    /** Always populated (defaults to 'kg'), even for piece-sold products — harmless when unused. */
    weightUnit?: WeightUnit;
    /** Only meaningful when saleUnit is 'piece'. Lets a product be sold both individually and as a full package at a different price. */
    packageOption?: PackageOption | null;
    createdAt?: string;
    updatedAt?: string;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
/** @deprecated use useLowStockThreshold() — kept as the fallback default. */
export const LOW_STOCK_THRESHOLD = DEFAULT_LOW_STOCK_THRESHOLD;

export function getStockStatus(
    quantity: number,
    threshold: number = DEFAULT_LOW_STOCK_THRESHOLD
): StockStatus {
    if (quantity <= 0) return 'out-of-stock';
    if (quantity <= threshold) return 'low-stock';
    return 'in-stock';
}