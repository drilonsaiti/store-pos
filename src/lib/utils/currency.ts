export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'ALL', 'DEN'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: CurrencyCode): Intl.NumberFormat {
    let formatter = formatterCache.get(currency);

    if (!formatter) {
        formatter = new Intl.NumberFormat('en-IE', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        formatterCache.set(currency, formatter);
    }

    return formatter;
}

export function formatCurrency(
    value: number,
    currency: CurrencyCode = 'EUR',
): string {
    const amount = Number.isFinite(value) ? value : 0;

    if (currency === 'DEN') {
        return `${new Intl.NumberFormat('en-IE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)} DEN`;
    }

    return getFormatter(currency).format(amount);
}

export function toCents(value: number): number {
    return Math.round(value * 100);
}

export function fromCents(cents: number): number {
    return cents / 100;
}

export function calculateLineTotal(price: number, quantity: number): number {
    return fromCents(toCents(price) * quantity);
}

export function calculateCartTotal(
    lines: Array<{ price: number; quantity: number }>,
): number {
    const totalCents = lines.reduce(
        (sum, line) => sum + toCents(line.price) * line.quantity,
        0,
    );

    return fromCents(totalCents);
}