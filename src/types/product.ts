export interface Product {
  id: string;
  name: string;
  /** Always a string. Never coerce to number — barcodes can carry leading zeroes. */
  barCode: string;
  price: number;
  purchasePrice: number;
  quantity: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export const LOW_STOCK_THRESHOLD = 5;

export function getStockStatus(
  quantity: number,
  threshold: number = LOW_STOCK_THRESHOLD
): StockStatus {
  if (quantity <= 0) return 'out-of-stock';
  if (quantity <= threshold) return 'low-stock';
  return 'in-stock';
}
