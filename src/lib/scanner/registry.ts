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

/** Resolves a user preference into an actual engine instance. 'auto' picks
 * native when the browser supports it, ZXing otherwise — the same
 * behavior this app had before engine selection existed. */
export function resolveScannerEngine(preference: ScannerEngineId): ScannerEngine {
    if (preference === 'native') return createNativeEngine();
    if (preference === 'zxing') return createZXingEngine();
    if (preference === 'zbar') return createZbarEngine();

    const native = createNativeEngine();
    return native.isSupported() ? native : createZXingEngine();
}