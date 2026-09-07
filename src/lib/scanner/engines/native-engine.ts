import {ScannerEngine} from '@/types/scanner';

const BARCODE_FORMATS = [
    'ean_13',
    'ean_8',
    'upc_a',
    'upc_e',
    'code_128',
    'code_39',
];

/** Wraps the browser-native BarcodeDetector API — fastest option, no bundle
 * cost, but Chrome/Edge/Android-Chrome only (no Safari/iOS support). */
export function createNativeEngine(): ScannerEngine {
    let detector: any = null;

    return {
        id: 'native',
        label: 'Native (fastest, Chrome/Edge only)',
        mode: 'frame',

        isSupported: () =>
            typeof window !== 'undefined' && 'BarcodeDetector' in window,

        async init() {
            // @ts-expect-error - BarcodeDetector is not yet in lib.dom.d.ts everywhere
            detector = new window.BarcodeDetector({
                formats: BARCODE_FORMATS,
            });
        },

        async detectFrame(source) {
            if (!detector) return null;

            try {
                const results = await detector.detect(source);
                return results[0]?.rawValue ?? null;
            } catch {
                return null;
            }
        },
    };
}
