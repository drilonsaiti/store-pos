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

/**
 * Prefers the browser-native BarcodeDetector API (fast, no bundle cost).
 * Falls back to the @zxing/browser library, lazy-loaded only when needed,
 * for browsers (notably Safari/iOS) that don't ship BarcodeDetector.
 */
export function useCameraBarcodeScanner({onDetect, debounceMs = 500, enabled}: Options) {
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [hasTorch, setHasTorch] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
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
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
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
                    video: {facingMode: {ideal: 'environment'}},
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                const track = stream.getVideoTracks()[0];
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
                    const tick = async () => {
                        if (cancelled || !videoRef.current) return;
                        try {
                            const results = await detector.detect(videoRef.current);
                            if (results[0]?.rawValue) acceptDetection(results[0].rawValue);
                        } catch {
                            // transient decode error — keep scanning
                        }
                        rafRef.current = requestAnimationFrame(tick);
                    };
                    rafRef.current = requestAnimationFrame(tick);
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
