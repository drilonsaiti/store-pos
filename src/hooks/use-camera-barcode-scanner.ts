'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {normalizeBarcode} from '@/lib/utils/barcode';
import {resolveScannerEngine} from '@/lib/scanner/registry';
import type {ScannerEngine, ScannerEngineId} from '@/types/scanner';

export type ScannerStatus =
    | 'idle'
    | 'requesting-permission'
    | 'scanning'
    | 'permission-denied'
    | 'unavailable'
    | 'error';

interface ZoomCapability {
    min: number;
    max: number;
    step: number;
}

interface Options {
    onDetect: (barcode: string) => void;
    debounceMs?: number;
    enabled: boolean;
    /** Which decode engine to use — defaults to 'auto' if omitted. */
    engineId?: ScannerEngineId;
}

const DETECT_INTERVAL_MS = 100;

export function useCameraBarcodeScanner({
    onDetect,
    debounceMs = 500,
    enabled,
    engineId = 'auto',
}: Options) {
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [hasTorch, setHasTorch] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [zoomCapability, setZoomCapability] =
        useState<ZoomCapability | null>(null);
    const [zoom, setZoomState] = useState<number | null>(null);
    const [activeEngineId, setActiveEngineId] =
        useState<Exclude<ScannerEngineId, 'auto'> | null>(null);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const continuousControlsRef = useRef<{stop: () => void} | null>(null);
    const engineRef = useRef<ScannerEngine | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const useFullFrameNextRef = useRef(false);
    const lastDetectionRef = useRef<{code: string; time: number}>({
        code: '',
        time: 0,
    });

    const acceptDetection = useCallback(
        (raw: string) => {
            const code = normalizeBarcode(raw);
            const now = performance.now();
            const last = lastDetectionRef.current;

            if (code === last.code && now - last.time < debounceMs) {
                return;
            }

            lastDetectionRef.current = {code, time: now};
            onDetect(code);
        },
        [onDetect, debounceMs],
    );

    const cleanupScanner = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        intervalRef.current = null;

        continuousControlsRef.current?.stop();
        continuousControlsRef.current = null;

        engineRef.current?.dispose?.();
        engineRef.current = null;

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const stop = useCallback(() => {
        cleanupScanner();

        setStatus('idle');
        setHasTorch(false);
        setTorchOn(false);
        setZoomCapability(null);
        setZoomState(null);
        setActiveEngineId(null);
    }, [cleanupScanner]);

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

    const setZoom = useCallback(async (value: number) => {
        const track = streamRef.current?.getVideoTracks()[0];

        if (!track) return;

        try {
            // @ts-expect-error - zoom is a non-standard MediaTrackConstraint
            await track.applyConstraints({advanced: [{zoom: value}]});

            setZoomState(value);
        } catch {
            // Zoom unsupported / value rejected — silently ignore.
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            cleanupScanner();
            return;
        }

        let cancelled = false;

        async function start() {
            setStatus('requesting-permission');

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: {ideal: 'environment'},
                        width: {ideal: 1920},
                        height: {ideal: 1080},
                    },
                    audio: false,
                });

                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;

                const track = stream.getVideoTracks()[0];

                try {
                    // @ts-expect-error - focusMode is not in the standard TS lib types
                    await track.applyConstraints({
                        advanced: [{focusMode: 'continuous'} as MediaTrackConstraintSet],
                    });
                } catch {
                    // Unsupported — safe to ignore.
                }

                const capabilities = track?.getCapabilities?.() as
                    | (MediaTrackCapabilities & {
                          torch?: boolean;
                          zoom?: {
                              min: number;
                              max: number;
                              step: number;
                          };
                      })
                    | undefined;

                setHasTorch(Boolean(capabilities?.torch));

                if (capabilities?.zoom) {
                    setZoomCapability(capabilities.zoom);
                    setZoomState(capabilities.zoom.min);
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                if (cancelled) return;

                const engine = resolveScannerEngine(engineId);
                engineRef.current = engine;

                await engine.init();

                if (cancelled) return;

                setActiveEngineId(engine.id);
                setStatus('scanning');

                if (
                    engine.mode === 'continuous' &&
                    engine.startContinuous &&
                    videoRef.current
                ) {
                    continuousControlsRef.current =
                        await engine.startContinuous(
                            videoRef.current,
                            acceptDetection,
                        );
                    return;
                }

                if (!canvasRef.current) {
                    canvasRef.current = document.createElement('canvas');
                }

                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d', {
                    willReadFrequently: true,
                });

                intervalRef.current = setInterval(async () => {
                    const video = videoRef.current;
                    const activeEngine = engineRef.current;

                    if (
                        !video ||
                        video.readyState < 2 ||
                        !activeEngine?.detectFrame
                    ) {
                        return;
                    }

                    try {
                        const useFullFrame = useFullFrameNextRef.current;
                        useFullFrameNextRef.current =
                            !useFullFrameNextRef.current;

                        if (useFullFrame) {
                            const code =
                                await activeEngine.detectFrame(video);

                            if (code) {
                                acceptDetection(code);
                            }

                            return;
                        }

                        if (!ctx) return;

                        const vw = video.videoWidth;
                        const vh = video.videoHeight;

                        if (!vw || !vh) return;

                        const cropW = vw * 0.92;
                        const cropH = vh * 0.7;
                        const sx = (vw - cropW) / 2;
                        const sy = (vh - cropH) / 2;

                        canvas.width = cropW;
                        canvas.height = cropH;

                        ctx.drawImage(
                            video,
                            sx,
                            sy,
                            cropW,
                            cropH,
                            0,
                            0,
                            cropW,
                            cropH,
                        );

                        const code = await activeEngine.detectFrame(canvas);

                        if (code) {
                            acceptDetection(code);
                        }
                    } catch {
                        // Transient decode error — keep scanning.
                    }
                }, DETECT_INTERVAL_MS);
            } catch (error) {
                if (cancelled) return;

                const name = (error as DOMException)?.name;

                setStatus(
                    name === 'NotAllowedError'
                        ? 'permission-denied'
                        : 'unavailable',
                );
            }
        }

        void start();

        return () => {
            cancelled = true;
            cleanupScanner();
        };
    }, [enabled, engineId, cleanupScanner, acceptDetection]);

    return {
        videoRef,
        status,
        hasTorch,
        torchOn,
        toggleTorch,
        zoomCapability,
        zoom,
        setZoom,
        activeEngineId,
        stop,
        retry: () => setStatus('idle'),
    };
}
