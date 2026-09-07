import type {Product} from '@/types/product';
import type {CartLineMode} from '@/types/cart';

export interface StockDelta {
    productId: string;
    delta: number;
}

interface LineLike {
    idProduct: string;
    quantity: number;
    mode?: CartLineMode;
}

/**
 * Converts sale/refund line items into per-product stock deltas.
 * `sign` is -1 for a sale (stock goes down) and +1 for a refund (stock goes
 * back up). Package lines are converted to pieces using the product's
 * current `packageOption.piecesPerPackage`; lines referencing a
 * since-deleted product are skipped — nothing to adjust.
 */
export function computeStockDeltas(
    lines: LineLike[],
    products: Product[],
    sign: 1 | -1
): StockDelta[] {
    const byId = new Map(products.map((p) => [p.id, p]));
    const deltas = new Map<string, number>();

    for (const line of lines) {
        const product = byId.get(line.idProduct);
        if (!product) continue;

        const pieces =
            line.mode === 'package'
                ? line.quantity * (product.packageOption?.piecesPerPackage ?? 1)
                : line.quantity;

        deltas.set(line.idProduct, (deltas.get(line.idProduct) ?? 0) + sign * pieces);
    }

    return Array.from(deltas.entries()).map(([productId, delta]) => ({productId, delta}));
}

/** Live stock for a line's product, or null if the product can no longer be
 * found (e.g. deleted from the catalog after being added to the cart). */
export function getAvailableQuantity(productId: string, products: Product[]): number | null {
    const product = products.find((p) => p.id === productId);
    return product ? product.quantity : null;
}

/** A cart line is "oversold" when the requested amount (converted to pieces
 * for package lines) exceeds what's currently on hand. This is a soft,
 * non-blocking signal — not a hard client-side block — since small retail
 * often needs to sell through a stock-count lag or take a backorder. The
 * real floor is enforced server-side (see createSale + the quantity >= 0
 * Firebase rule); this is purely so the cashier isn't surprised by it. */
export function isLineOversold(
    line: {productId: string; quantity: number; mode?: CartLineMode},
    products: Product[]
): boolean {
    const product = products.find((p) => p.id === line.productId);
    if (!product) return false; // missing product is a separate concern
    const pieces =
        line.mode === 'package'
            ? line.quantity * (product.packageOption?.piecesPerPackage ?? 1)
            : line.quantity;
    return pieces > product.quantity;
}