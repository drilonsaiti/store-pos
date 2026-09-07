import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, isToday } from '../dates';

describe('date utils', () => {
    it('formats a valid ISO date', () => {
        expect(formatDate('2026-06-15T00:00:00.000Z')).toMatch(/2026/);
    });

    it('formats a valid ISO date-time', () => {
        expect(formatDateTime('2026-06-15T09:30:00.000Z')).toMatch(/2026/);
    });

    it('returns an em dash for an unparseable date rather than "Invalid Date"', () => {
        expect(formatDate('not-a-real-date')).toBe('—');
        expect(formatDateTime('not-a-real-date')).toBe('—');
    });

    it('recognizes today and rejects a date from a year ago', () => {
        expect(isToday(new Date().toISOString())).toBe(true);
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        expect(isToday(lastYear.toISOString())).toBe(false);
    });
});