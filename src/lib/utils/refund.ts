import type {RawSale, Sale} from '@/types/sale';
import type {CartLineMode} from '@/types/cart';

/** How much of a given sale line has already been refunded — a line is
 * matched by product + mode, since a product can appear on a sale as both a
 * piece line and a package line, refundable independently. */
export function getRefundedQuantity(sale: Sale, idProduct: string, mode: CartLineMode | undefined): number {
    return (sale.refunds ?? []).reduce((sum, refund) => {
        const matching = refund.lines.filter(
            (l) => l.idProduct === idProduct && (l.mode ?? 'piece') === (mode ?? 'piece')
        );
        return sum + matching.reduce((s, l) => s + l.quantity, 0);
    }, 0);
}

export function getSaleRefundedTotal(sale: Sale): number {
    return (sale.refunds ?? []).reduce((sum, r) => sum + r.amount, 0);
}

export function getSaleNetTotal(sale: Sale): number {
    return sale.totalPrice - getSaleRefundedTotal(sale);
}

export function normalizeSale(id: string, raw: RawSale): Sale {
    return {
        id,
        ...raw,
        refunds: raw.refunds
            ? Object.entries(raw.refunds).map(([refundId, refund]) => ({id: refundId, ...refund}))
            : [],
    };
}