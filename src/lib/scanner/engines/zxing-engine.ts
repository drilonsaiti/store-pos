import {ScannerEngine} from "@/types/scanner";

/** ZXing (JS port of the Java library) — works in every browser including
 * Safari/iOS, but runs its own continuous decode loop against the video
 * element rather than being fed our cropped frames. */
export function createZXingEngine(): ScannerEngine {
    return {
        id: 'zxing',
        label: 'ZXing (works everywhere, no crop benefit)',
        mode: 'continuous',
        isSupported: () => true,
        async init() {
            // Lazy-loaded on first use in startContinuous — nothing to prepare up front.
        },
        async startContinuous(video, onResult) {
            const { BrowserMultiFormatReader } = await import('@zxing/browser');
            const reader = new BrowserMultiFormatReader();
            const controls = await reader.decodeFromVideoElement(video, (result) => {
                if (result) onResult(result.getText());
            });
            return { stop: () => controls.stop() };
        },
    };
}