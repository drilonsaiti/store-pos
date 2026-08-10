const formatter = new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Formats a number as EUR currency, e.g. formatCurrency(1250.5) -> "€1,250.50" */
export function formatCurrency(value: number): string {
    return formatter.format(Number.isFinite(value) ? value : 0);
}

/**
 * Converts a money value to integer cents for arithmetic, avoiding
 * float drift when summing many cart lines.
 */
export function toCents(value: number): number {
    return Math.round(value * 100);
}

export function fromCents(cents: number): number {
    return cents / 100;
}

export function calculateLineTotal(price: number, quantity: number): number {
    return fromCents(toCents(price) * quantity);
}

export function calculateCartTotal(lines: Array<{ price: number; quantity: number }>): number {
    const totalCents = lines.reduce((sum, line) => sum + toCents(line.price) * line.quantity, 0);
    return fromCents(totalCents);
}
