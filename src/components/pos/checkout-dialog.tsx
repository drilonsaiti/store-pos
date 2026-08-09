'use client';

import { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function CheckoutDialog({ open, onOpenChange, onConfirm, isSubmitting }: Props) {
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total());
  const totalQuantity = useCartStore((s) => s.totalQuantity());
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmButtonRef.current?.focus();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm sale</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 divide-y overflow-y-auto text-sm">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between py-2">
              <span className="truncate pr-2">
                {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
              </span>
              <span className="tabular shrink-0 font-medium">{formatCurrency(item.price * item.quantity)}</span>
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
            <span className="tabular">{formatCurrency(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button ref={confirmButtonRef} onClick={onConfirm} disabled={isSubmitting} size="lg">
            {isSubmitting ? 'Saving sale…' : 'Complete sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
