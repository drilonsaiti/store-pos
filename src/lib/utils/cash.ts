export function getQuickCashAmounts(total: number): number[] {
    const exact = Math.round(total * 100) / 100;
    const amounts = new Set<number>([exact]);
    for (const step of [5, 10, 20, 50, 100]) {
        const rounded = Math.ceil(total / step) * step;
        if (rounded > total) amounts.add(rounded);
    }
    return Array.from(amounts)
        .sort((a, b) => a - b)
        .slice(0, 5);
}