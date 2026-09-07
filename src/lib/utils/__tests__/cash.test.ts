import {describe, it, expect} from 'vitest';
import {getQuickCashAmounts} from '../cash';

describe('getQuickCashAmounts', () => {
    it('always includes the exact total first', () => {
        const amounts = getQuickCashAmounts(3.5);
        expect(amounts[0]).toBe(3.5);
    });

    it('offers the next round 5/10/20/50/100 above the total, capped at 5 suggestions', () => {
        const amounts = getQuickCashAmounts(3.5);
        expect(amounts).toContain(5);
        expect(amounts).toContain(10);
        expect(amounts).toContain(20);
        expect(amounts).toContain(50);
        expect(amounts).toHaveLength(5);
    });


    it('does not suggest a round amount equal to an already-round total', () => {
        const amounts = getQuickCashAmounts(10);

        // 10 is present only as the exact total, not as an additional suggestion.
        expect(amounts[0]).toBe(10);
        expect(amounts.slice(1)).not.toContain(10);
    });


    it('deduplicates when multiple steps round to the same amount', () => {
        // 19.99 rounds up to 20 for both the 5-step and the 10-step and the 20-step
        const amounts = getQuickCashAmounts(19.99);
        expect(amounts.filter((a) => a === 20)).toHaveLength(1);
    });

    it('handles a zero total without throwing', () => {
        expect(() => getQuickCashAmounts(0)).not.toThrow();
        expect(getQuickCashAmounts(0)).toEqual([0]);
    });
});