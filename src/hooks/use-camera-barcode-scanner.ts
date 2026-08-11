'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {normalizeBarcode} from '@/lib/utils/barcode';

export type ScannerStatus =
    | 'idle'
    | 'requesting-permission'
    | 'scanning'
    | 'permission-denied'
    | 'unavailable'
    | 'error';

interface Options {
    onDetect: (barcode: string) => void;
    /** Minimum time between accepted detections, so a held-still barcode doesn't spam the cart. */
    debounceMs?: number;
    enabled: boolean;
}

// Retail-relevant formats only, per spec — keeps native detector fast.
const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

// How often we run a detection pass. Small/worn barcodes decode more
// reliably at a higher sample rate (more attempts per second to catch a
// clean, non-blurred frame) — 100ms is a reasonable balance against battery drain.
const DETECT_INTERVAL_MS = 100;

/**
 * Prefers the browser-native BarcodeDetector API (fast, no bundle cost).
 * Falls back to the @zxing/browser library, lazy-loaded only when needed,
 * for browsers (notably Safari/iOS) that don't ship BarcodeDetector.
 *
 * For the native path, each frame is cropped to roughly the on-screen scan
 * frame before detection — this is the single biggest lever for reading
 * small or worn barcodes: cropping increases the barcode's size relative to
 * the analyzed image, which is what most decoders actually struggle with,
 * far more than raw camera resolution alone. The ZXing fallback doesn't
 * support this cropping without a larger rewrite, so it stays full-frame.
 */
export function useCameraBarcodeScanner({onDetect, debounceMs = 500, enabled}: Options) {
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [hasTorch, setHasTorch] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const lastDetectionRef = useRef<{ code: string; time: number }>({code: '', time: 0});

    const acceptDetection = useCallback(
        (raw: string) => {
            const code = normalizeBarcode(raw);
            const now = performance.now();
            const last = lastDetectionRef.current;
            if (code === last.code && now - last.time < debounceMs) return;
            lastDetectionRef.current = {code, time: now};
            onDetect(code);
        },
        [onDetect, debounceMs]
    );

    const stop = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        zxingControlsRef.current?.stop();
        zxingControlsRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStatus('idle');
    }, []);

    const toggleTorch = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        try {
            const next = !torchOn;
            // @ts-expect-error - torch is a non-standard MediaTrackConstraint
            await track.applyConstraints({advanced: [{torch: next}]});
            setTorchOn(next);
        } catch {
            // Torch unsupported on this device — silently ignore.
        }
    }, [torchOn]);

    useEffect(() => {
        if (!enabled) {
            stop();
            return;
        }

        let cancelled = false;

        async function start() {
            setStatus('requesting-permission');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: {ideal: 'environment'},
                        // High enough resolution that a small/worn barcode still has
                        // real pixel detail after cropping down to the scan frame.
                        width: {ideal: 1920},
                        height: {ideal: 1080},
                    },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                const track = stream.getVideoTracks()[0];

                // Continuous autofocus helps small/close-up barcodes far more than
                // resolution alone — not universally supported, so best-effort.
                try {
                    // @ts-expect-error - focusMode is not in the standard TS lib types
                    await track.applyConstraints({advanced: [{focusMode: 'continuous'}]});
                } catch {
                    // unsupported on this device/browser — safe to ignore
                }

                const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & {
                    torch?: boolean
                }) | undefined;
                setHasTorch(Boolean(capabilities?.torch));

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setStatus('scanning');

                if ('BarcodeDetector' in window) {
                    // @ts-expect-error - BarcodeDetector is not yet in lib.dom.d.ts everywhere
                    const detector = new window.BarcodeDetector({formats: BARCODE_FORMATS});
                    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d', {willReadFrequently: true});

                    intervalRef.current = setInterval(async () => {
                        const video = videoRef.current;
                        if (!video || video.readyState < 2 || !ctx) return;
                        try {
                            // Crop to roughly the visible scan-frame rectangle (matches
                            // the aspect-[3/2] overlay in BarcodeScanner): centered,
                            // ~85% width / ~55% height of the full frame. Tune these two
                            // ratios if real-world testing shows the crop doesn't line up
                            // with what's actually drawn on screen.
                            const vw = video.videoWidth;
                            const vh = video.videoHeight;
                            if (!vw || !vh) return;
                            const cropW = vw * 0.85;
                            const cropH = vh * 0.55;
                            const sx = (vw - cropW) / 2;
                            const sy = (vh - cropH) / 2;

                            canvas.width = cropW;
                            canvas.height = cropH;
                            ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

                            const results = await detector.detect(canvas);
                            if (results[0]?.rawValue) acceptDetection(results[0].rawValue);
                        } catch {
                            // transient decode error — keep scanning
                        }
                    }, DETECT_INTERVAL_MS);
                } else {
                    const {BrowserMultiFormatReader} = await import('@zxing/browser');
                    if (cancelled) return;
                    const reader = new BrowserMultiFormatReader();
                    const controls = await reader.decodeFromVideoElement(videoRef.current as HTMLVideoElement, (result) => {
                        if (result) acceptDetection(result.getText());
                    });
                    zxingControlsRef.current = controls;
                }
            } catch (error) {
                if (cancelled) return;
                const name = (error as DOMException)?.name;
                setStatus(name === 'NotAllowedError' ? 'permission-denied' : 'unavailable');
            }
        }

        start();

        return () => {
            cancelled = true;
            stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    return {videoRef, status, hasTorch, torchOn, toggleTorch, retry: () => setStatus('idle')};
}