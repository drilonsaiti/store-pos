'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/stores/cart-store';
import { useFormatCurrency } from '@/hooks/use-currency';
import { getQuickCashAmounts } from '@/lib/utils/cash';

export interface PaymentInfo {
    amountReceived?: number;
    changeDue?: number;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (payment: PaymentInfo) => void;
    isSubmitting: boolean;
}

export function CheckoutDialog({ open, onOpenChange, onConfirm, isSubmitting }: Props) {
    const items = useCartStore((s) => s.items);
    const total = useCartStore((s) => s.total());
    const totalQuantity = useCartStore((s) => s.totalQuantity());
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    const fmt = useFormatCurrency();

    const [cashInput, setCashInput] = useState('');

    useEffect(() => {
        if (open) {
            confirmButtonRef.current?.focus();
            setCashInput('');
        }
    }, [open]);

    const received = cashInput.trim() === '' ? null : Number(cashInput);
    const hasCashEntry = received !== null && Number.isFinite(received);
    const changeDue = hasCashEntry ? Math.max(0, Math.round((received! - total) * 100) / 100) : null;
    const insufficientCash = hasCashEntry && received! < total;

    const handleConfirm = () => {
        if (insufficientCash) return;
        onConfirm(
            hasCashEntry
                ? { amountReceived: Math.round(received! * 100) / 100, changeDue: changeDue ?? 0 }
                : {}
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm sale</DialogTitle>
                </DialogHeader>
                <div className="max-h-56 divide-y overflow-y-auto text-sm">
                    {items.map((item) => (
                        <div key={item.lineId} className="flex items-center justify-between py-2">
              <span className="truncate pr-2">
                {item.name}{' '}
                  <span className="text-muted-foreground">
                  × {item.quantity}
                      {item.unitLabel ? ` ${item.unitLabel}` : ''}
                </span>
              </span>
                            <span className="tabular shrink-0 font-medium">{fmt(item.price * item.quantity)}</span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-1 border-t pt-3 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Items</span>
                        <span className="tabular">{totalQuantity}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span className="tabular">{fmt(total)}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 border-t pt-3">
                    <Label htmlFor="cash-received">Cash received (optional)</Label>
                    <Input
                        id="cash-received"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        placeholder={fmt(total)}
                        value={cashInput}
                        onChange={(e) => setCashInput(e.target.value)}
                        aria-invalid={insufficientCash}
                        className="tabular"
                    />
                    <div className="flex flex-wrap gap-2">
                        {getQuickCashAmounts(total).map((amount) => (
                            <Button key={amount} type="button" variant="outline" size="sm" onClick={() => setCashInput(String(amount))}>
                                {fmt(amount)}
                            </Button>
                        ))}
                    </div>

                    {insufficientCash && (
                        <p className="text-sm text-destructive">Amount received is less than the total.</p>
                    )}
                    {hasCashEntry && !insufficientCash && (
                        <div className="flex justify-between rounded-md bg-secondary px-3 py-2 text-sm font-medium">
                            <span>Change due</span>
                            <span className="tabular">{fmt(changeDue ?? 0)}</span>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button ref={confirmButtonRef} onClick={handleConfirm} disabled={isSubmitting || insufficientCash} size="lg">
                        {isSubmitting ? 'Saving sale…' : 'Complete sale'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}