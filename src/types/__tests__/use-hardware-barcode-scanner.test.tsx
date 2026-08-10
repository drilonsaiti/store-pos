// @vitest-environment jsdom
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useHardwareBarcodeScanner} from '../../hooks/use-hardware-barcode-scanner';

/** Dispatches a keydown for each character, `gapMs` apart, then a final Enter. */
async function typeAsScanner(text: string, gapMs: number) {
    for (const char of text) {
        document.dispatchEvent(new KeyboardEvent('keydown', {key: char, bubbles: true}));
        if (gapMs > 0) await new Promise((r) => setTimeout(r, gapMs));
    }
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
}

describe('useHardwareBarcodeScanner', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('recognizes fast, scanner-speed keystrokes followed by Enter', async () => {
        const onScan = vi.fn();
        renderHook(() => useHardwareBarcodeScanner({onScan, maxKeystrokeGapMs: 40, minLength: 6}));

        await typeAsScanner('5449000000996', 5);

        expect(onScan).toHaveBeenCalledWith('5449000000996');
    });

    it('ignores slow, human-speed typing even when it ends with Enter', async () => {
        const onScan = vi.fn();
        renderHook(() => useHardwareBarcodeScanner({onScan, maxKeystrokeGapMs: 40, minLength: 6}));

        await typeAsScanner('5449000000996', 80);

        expect(onScan).not.toHaveBeenCalled();
    });

    it('ignores a scan shorter than minLength', async () => {
        const onScan = vi.fn();
        renderHook(() => useHardwareBarcodeScanner({onScan, maxKeystrokeGapMs: 40, minLength: 6}));

        await typeAsScanner('123', 5);

        expect(onScan).not.toHaveBeenCalled();
    });

    it('does not fire while focus is inside a text input, so it never blocks normal typing', async () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        const onScan = vi.fn();
        renderHook(() => useHardwareBarcodeScanner({onScan, maxKeystrokeGapMs: 40, minLength: 6}));

        for (const char of '5449000000996') {
            input.dispatchEvent(new KeyboardEvent('keydown', {key: char, bubbles: true}));
        }
        input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

        expect(onScan).not.toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
        const onScan = vi.fn();
        renderHook(() => useHardwareBarcodeScanner({onScan, maxKeystrokeGapMs: 40, minLength: 6, enabled: false}));

        await typeAsScanner('5449000000996', 5);

        expect(onScan).not.toHaveBeenCalled();
    });
});