import { createNativeEngine } from './engines/native-engine';
import { createZXingEngine } from './engines/zxing-engine';
import { createZbarEngine } from './engines/zbar-engine';
import {ScannerEngine, ScannerEngineId} from "@/types/scanner";

export const SCANNER_ENGINE_OPTIONS: Array<{ id: ScannerEngineId; label: string }> = [
    { id: 'auto', label: 'Automatic (recommended)' },
    { id: 'native', label: 'Native (fastest, Chrome/Edge only)' },
    { id: 'zxing', label: 'ZXing (works everywhere)' },
    { id: 'zbar', label: 'ZBar (experimental)' },
];

function isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    // iPadOS 13+ reports as "MacIntel" with touch support in its UA string,
    // not the classic "iPad" token — check for that too. Every browser on
    // iOS (Safari, Chrome-for-iOS, Brave-for-iOS, etc.) is required by
    // Apple to run on WebKit, so this one check covers all of them.
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// zbar-wasm's isSupported() can't actually detect whether its .wasm asset
// will load correctly in this deployment — and Safari/WebKit (all iOS
// browsers) is known to be much stricter about WASM MIME types and
// streaming compilation than Chrome, which can silently mask a broken
// zbar load on desktop while failing outright on iOS. ZXing (pure JS, no
// WASM) is what reliably worked here before zbar was added to this list,
// so iOS skips it entirely in the automatic fallback chain.
const FALLBACK_ORDER_IOS: Array<() => ScannerEngine> = [
    createNativeEngine,
    createZXingEngine,
];

/** Preference order for 'auto', and the fallback chain used when an
 * explicitly-selected engine turns out to be unsupported on this browser
 * (e.g. 'native' picked on Safari/iOS, which never ships BarcodeDetector
 * in any iOS browser — Apple requires all of them to run on WebKit).
 * ZBar is tried before ZXing: in practice it decodes more reliably. */
const FALLBACK_ORDER_DEFAULT: Array<() => ScannerEngine> = [
    createNativeEngine,
    createZbarEngine,
    createZXingEngine,
];

function firstSupported(): ScannerEngine {
    const order = isIOS() ? FALLBACK_ORDER_IOS : FALLBACK_ORDER_DEFAULT;
    for (const create of order) {
        const engine = create();
        if (engine.isSupported()) return engine;
    }
    return createZXingEngine();
}

/** Resolves a user preference into an actual engine instance. An explicit
 * choice is honored only if it's actually supported on this browser;
 * otherwise it transparently falls back through the same order 'auto'
 * uses, instead of handing back an engine that will just fail immediately
 * (e.g. 'native' explicitly selected on an iPhone). */
export function resolveScannerEngine(preference: ScannerEngineId): ScannerEngine {
    if (preference === 'auto') return firstSupported();

    const requested =
        preference === 'native' ? createNativeEngine() :
            preference === 'zbar' ? createZbarEngine() :
                createZXingEngine();

    return requested.isSupported() ? requested : firstSupported();
}