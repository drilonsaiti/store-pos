'use client';

import {useEffect} from 'react';
import {CameraOff, Check, Minus, PackageX, Plus, RotateCcw, ShieldAlert, X, Zap, ZapOff} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {useCameraBarcodeScanner} from '@/hooks/use-camera-barcode-scanner';
import {useCartStore} from '@/stores/cart-store';
import {useFormatCurrency} from '@/hooks/use-currency';
import {useScannerEnginePreference} from "@/hooks/use-scanner-engine-preference";

export interface ScanFeedback {
    type: 'success' | 'error';
    message: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDetect: (barcode: string) => void;
    feedback: ScanFeedback | null;
    cartCount?: number;
    cartTotal?: number;
    lastProductId?: string | null;
    showSummary?: boolean;
}

function retryCamera(onOpenChange: (open: boolean) => void) {
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 0);
}

export function BarcodeScanner({
                                   open,
                                   onOpenChange,
                                   onDetect,
                                   feedback,
                                   cartCount = 0,
                                   cartTotal = 0,
                                   lastProductId,
                                   showSummary = true,
                               }: Props) {
    const { engine } = useScannerEnginePreference();
    const { videoRef, status, hasTorch, torchOn, toggleTorch, zoomCapability, zoom, setZoom, activeEngineId } =
        useCameraBarcodeScanner({
            enabled: open,
            engineId: engine,
            onDetect: (code) => onDetect(code),
        });

    const items = useCartStore((s) => s.items);
    const incrementItem = useCartStore((s) => s.incrementItem);
    const decrementItem = useCartStore((s) => s.decrementItem);
    const fmt = useFormatCurrency();
    // Only the plain "piece" line is relevant here — weight/package products
    // are routed to AddSpecialItemDialog instead of ever reaching this panel.
    const lastItem =
        showSummary && lastProductId ? items.find((i) => i.productId === lastProductId && i.mode === 'piece') : undefined;

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onOpenChange(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="h-dvh max-h-dvh w-screen max-w-none rounded-none border-0 p-0 sm:h-[min(90dvh,720px)] sm:max-w-md sm:rounded-lg">
                <DialogTitle className="sr-only">Scan barcode</DialogTitle>
                <div className="relative flex h-full flex-col overflow-hidden bg-black text-white sm:rounded-lg">
                    <div className="safe-bottom flex items-center justify-between p-4">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10"
                                onClick={() => onOpenChange(false)}>
                            <X className="h-5 w-5"/>
                            <span className="sr-only">Close</span>
                        </Button>
                        <p className="text-sm font-medium">Scan barcode</p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10 disabled:opacity-30"
                            disabled={!hasTorch}
                            onClick={toggleTorch}
                            aria-label="Toggle flashlight"
                        >
                            {torchOn ? <ZapOff className="h-5 w-5"/> : <Zap className="h-5 w-5"/>}
                        </Button>
                    </div>

                    <div
                        className={`relative shrink-0 ${showSummary ? 'h-[42dvh] min-h-[260px]' : 'h-[60dvh] min-h-[320px]'}`}>
                        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline
                               muted/>

                        {status === 'scanning' && (
                            <div className="absolute inset-0 flex items-center justify-center p-6">
                                <div
                                    className="relative aspect-[3/2] w-full max-w-xs overflow-hidden rounded-2xl border-2 border-white/80">
                                    <div className="absolute inset-x-0 top-0 h-0.5 animate-scan-line bg-primary"/>
                                </div>
                            </div>
                        )}

                        {feedback && (
                            <div
                                className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4"
                                role="status"
                                aria-live="polite"
                            >
                                <div
                                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
                                        feedback.type === 'success' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'
                                    }`}
                                >
                                    {feedback.type === 'success' ? <Check className="h-4 w-4"/> :
                                        <PackageX className="h-4 w-4"/>}
                                    {feedback.message}
                                </div>
                            </div>
                        )}

                        {(status === 'requesting-permission' || status === 'idle') && (
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center">
                                <div
                                    className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"/>
                                <p className="text-sm text-white/80">Starting camera…</p>
                            </div>
                        )}

                        {status === 'permission-denied' && (
                            <StatusOverlay
                                icon={ShieldAlert}
                                title="Camera access denied"
                                description="Allow camera access in your browser settings to scan barcodes."
                            />
                        )}

                        {status === 'unavailable' && (
                            <StatusOverlay
                                icon={CameraOff}
                                title="Camera unavailable"
                                description="No camera could be started on this device."
                                action={
                                    <Button variant="secondary" onClick={() => retryCamera(onOpenChange)}>
                                        <RotateCcw className="h-4 w-4"/>
                                        Retry
                                    </Button>
                                }
                            />
                        )}
                    </div>

                    <p className="px-4 pt-3 text-center text-xs text-white/60">
                        Curved packaging (cans, bottles)? Tilt it slightly so the barcode faces the camera as flat as
                        possible — the flattest section reads best.
                    </p>

                    {zoomCapability && zoom !== null && (
                        <div className="flex items-center gap-3 px-4 pb-1 pt-2">
                            <span className="text-xs text-white/60">Zoom</span>
                            <input
                                type="range"
                                min={zoomCapability.min}
                                max={zoomCapability.max}
                                step={zoomCapability.step || 0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="h-1.5 flex-1 accent-primary"
                                aria-label="Camera zoom"
                            />
                        </div>
                    )}

                    {activeEngineId && (
                        <p className="px-4 pb-1 text-center text-[10px] uppercase tracking-wide text-white/40">
                            Engine: {activeEngineId}
                        </p>
                    )}

                    {showSummary && (
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            {lastItem ? (
                                <div className="flex items-center gap-3 rounded-lg bg-white/10 p-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{lastItem.name}</p>
                                        <p className="tabular text-xs text-white/60">{fmt(lastItem.price)} each</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-9 w-9"
                                            aria-label={`Decrease quantity of ${lastItem.name}`}
                                            onClick={() => decrementItem(lastItem.lineId)}
                                        >
                                            <Minus className="h-4 w-4"/>
                                        </Button>
                                        <span
                                            className="tabular w-6 text-center text-sm font-semibold">{lastItem.quantity}</span>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-9 w-9"
                                            aria-label={`Increase quantity of ${lastItem.name}`}
                                            onClick={() => incrementItem(lastItem.lineId)}
                                        >
                                            <Plus className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-sm text-white/50">Scanned items will appear here</p>
                            )}
                        </div>
                    )}

                    {showSummary && (
                        <div
                            className="safe-bottom flex items-center justify-between gap-3 border-t border-white/10 bg-black/90 p-4">
                            <div className="text-sm">
                                <p className="text-white/60">
                                    {cartCount} item{cartCount === 1 ? '' : 's'}
                                </p>
                                <p className="tabular text-lg font-semibold">{fmt(cartTotal)}</p>
                            </div>
                            <Button size="lg" onClick={() => onOpenChange(false)} disabled={cartCount === 0}>
                                Done scanning
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function StatusOverlay({
                           icon: Icon,
                           title,
                           description,
                           action,
                       }: {
    icon: typeof ShieldAlert;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-8 text-center">
            <Icon className="h-8 w-8 text-white/70"/>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-white/70">{description}</p>
            {action}
        </div>
    );
}