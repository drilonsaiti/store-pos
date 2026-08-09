import type { Product } from '@/types/product';

/**
 * Barcode values must NEVER be coerced to number — EAN-13 codes routinely
 * carry leading zeroes (e.g. "0123456789012") that a numeric type would drop.
 */
export function normalizeBarcode(raw: string): string {
  return raw.trim();
}

export function isLikelyBarcode(value: string): boolean {
  const trimmed = normalizeBarcode(value);
  return /^\d{6,14}$/.test(trimmed);
}

/** O(1) barcode -> product lookup map, rebuilt whenever the product list changes. */
export function buildBarcodeIndex(products: Product[]): Map<string, Product> {
  const index = new Map<string, Product>();
  for (const product of products) {
    if (product.barCode) {
      index.set(normalizeBarcode(product.barCode), product);
    }
  }
  return index;
}

export function findProductByBarcode(
  index: Map<string, Product>,
  barcode: string
): Product | undefined {
  return index.get(normalizeBarcode(barcode));
}

export function findProductByNameOrBarcode(
  products: Product[],
  query: string
): Product | undefined {
  const normalized = normalizeBarcode(query).toLowerCase();
  return products.find(
    (p) => normalizeBarcode(p.barCode).toLowerCase() === normalized || p.name.toLowerCase() === normalized
  );
}
