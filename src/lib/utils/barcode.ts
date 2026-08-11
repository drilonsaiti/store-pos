import type {Product} from '@/types/product';
import {normalizeSearchText} from './search';

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

/**
 * Fallback for manually-typed submissions (Enter in the POS search box):
 * exact barcode match first, then an exact — but diacritic/Cyrillic-
 * normalized — name match. Deliberately exact rather than fuzzy here,
 * since this path adds whatever it finds straight to the cart; fuzzy
 * matching lives in the suggestions dropdown (lib/utils/search.ts), where
 * the cashier picks from a list instead of it being auto-selected.
 */
export function findProductByNameOrBarcode(
    products: Product[],
    query: string
): Product | undefined {
    const normalizedBarcode = normalizeBarcode(query).toLowerCase();
    const normalizedName = normalizeSearchText(query);
    return products.find(
        (p) =>
            normalizeBarcode(p.barCode).toLowerCase() === normalizedBarcode ||
            normalizeSearchText(p.name) === normalizedName
    );
}