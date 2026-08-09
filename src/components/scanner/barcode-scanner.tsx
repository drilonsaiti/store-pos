'use client';

import { useEffect } from 'react';
import { X, Zap, ZapOff, RotateCcw, CameraOff, ShieldAlert, Check, PackageX } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCameraBarcodeScanner } from '@/hooks/use-camera-barcode-scanner';
import { formatCurrency } from '@/lib/utils/currency';

export interface ScanFeedback {
  type: 'success' | 'error';
  message: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetect: (barcode: string) => void;
  feedback: ScanFeedback | null;
  cartCount: number;
  cartTotal: number;
}

function retryCamera(onOpenChange: (open: boolean) => void) {
  onOpenChange(false);
  // Re-open on the next tick so the getUserMedia effect re-runs from a clean state.
  setTimeout(() => onOpenChange(true), 0);
}

/**
 * Full-screen dedicated scanner UI. Stays open across multiple scans so a
 * cashier can ring up an entire basket without touching the screen between
 * items — it only closes on Escape, the X button, or "Done".
 */
export function BarcodeScanner({ open, onOpenChange, onDetect, feedback, cartCount, cartTotal }: Props) {
  const { videoRef, status, hasTorch, torchOn, toggleTorch } = useCameraBarcodeScanner({
    enabled: open,
    onDetect: (code) => onDetect(code),
  });

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
      <DialogContent className="h-dvh max-h-dvh w-screen max-w-none rounded-none border-0 p-0 sm:h-[min(90dvh,720px)] sm:max-w-md sm:rounded-lg">
        <DialogTitle className="sr-only">Scan barcode</DialogTitle>
        <div className="relative flex h-full flex-col overflow-hidden bg-black text-white sm:rounded-lg">
          <div className="safe-bottom flex items-center justify-between p-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
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
              {torchOn ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
            </Button>
          </div>

          <div className="relative flex-1">
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />

            {status === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-40 w-72 max-w-[80%] overflow-hidden rounded-2xl border-2 border-white/80">
                  <div className="absolute inset-x-0 top-0 h-0.5 animate-scan-line bg-primary" />
                </div>
              </div>
            )}

            {/* Per-scan toast — appears over the viewfinder, auto-dismisses, camera never stops */}
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
                  {feedback.type === 'success' ? <Check className="h-4 w-4" /> : <PackageX className="h-4 w-4" />}
                  {feedback.message}
                </div>
              </div>
            )}

            {(status === 'requesting-permission' || status === 'idle') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
                    <RotateCcw className="h-4 w-4" />
                    Retry
                  </Button>
                }
              />
            )}
          </div>

          {/* Persistent running total — lets the cashier keep scanning without leaving the camera */}
          <div className="safe-bottom flex items-center justify-between gap-3 border-t border-white/10 bg-black/90 p-4">
            <div className="text-sm">
              <p className="text-white/60">{cartCount} item{cartCount === 1 ? '' : 's'}</p>
              <p className="tabular text-lg font-semibold">{formatCurrency(cartTotal)}</p>
            </div>
            <Button size="lg" onClick={() => onOpenChange(false)} disabled={cartCount === 0}>
              Done scanning
            </Button>
          </div>
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
      <Icon className="h-8 w-8 text-white/70" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-white/70">{description}</p>
      {action}
    </div>
  );
}
