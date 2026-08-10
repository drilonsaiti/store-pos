'use client';

import {useEffect, useRef} from 'react';
import {normalizeBarcode} from '@/lib/utils/barcode';

interface Options {
    onScan: (barcode: string) => void;
    /** Keystrokes this close together (ms) are treated as scanner input, not human typing. */
    maxKeystrokeGapMs?: number;
    minLength?: number;
    enabled?: boolean;
}

/**
 * Detects USB/Bluetooth barcode scanners, which behave like a keyboard that
 * types very fast and terminates with Enter. Ignores normal human typing and
 * never fires while focus is inside a text input, textarea, or contenteditable.
 */
export function useHardwareBarcodeScanner({
                                              onScan,
                                              maxKeystrokeGapMs = 40,
                                              minLength = 6,
                                              enabled = true,
                                          }: Options) {
    const bufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isTypingContext =
                target &&
                (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

            const now = performance.now();
            const gap = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

            if (gap > maxKeystrokeGapMs) {
                bufferRef.current = '';
            }

            if (e.key === 'Enter') {
                const candidate = normalizeBarcode(bufferRef.current);
                bufferRef.current = '';
                if (candidate.length >= minLength && gap <= maxKeystrokeGapMs) {
                    if (isTypingContext) {
                        // Let a scanner "typed into" a focused input still submit the
                        // form/search as usual — don't swallow the keystrokes.
                        return;
                    }
                    e.preventDefault();
                    onScan(candidate);
                }
                return;
            }

            if (e.key.length === 1) {
                bufferRef.current += e.key;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onScan, maxKeystrokeGapMs, minLength, enabled]);
}
