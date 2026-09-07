export type ScannerEngineId = 'auto' | 'native' | 'zxing' | 'zbar';

export interface ScannerEngine {
    id: Exclude<ScannerEngineId, 'auto'>;
    label: string;
    /** 'frame' engines are fed individual (optionally cropped) frames by the
     * shared loop in useCameraBarcodeScanner. 'continuous' engines run their
     * own internal decode loop against the raw video element and report
     * results via callback — they never see the crop, only the full frame. */
    mode: 'frame' | 'continuous';
    isSupported(): boolean;
    init(): Promise<void>;
    detectFrame?(source: HTMLCanvasElement | HTMLVideoElement): Promise<string | null>;
    startContinuous?(video: HTMLVideoElement, onResult: (code: string) => void): Promise<{ stop: () => void }>;
    dispose?(): void;
}