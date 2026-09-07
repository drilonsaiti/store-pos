'use client';

import {useMemo, useState} from 'react';
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {useFormatCurrency} from '@/hooks/use-currency';
import {useProducts} from '@/hooks/use-products';
import {useRefundSale} from '@/hooks/use-sales';
import {getRefundedQuantity} from '@/lib/utils/refund';
import {computeStockDeltas} from '@/lib/utils/stock';
import type {Sale} from '@/types/sale';

interface Props {
    sale: Sale;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function lineKey(idProduct: string, mode: string | undefined) {
    return `${idProduct}::${mode ?? 'piece'}`;
}

export function RefundDialog({sale, open, onOpenChange}: Props) {
    const fmt = useFormatCurrency();
    const {data: products = []} = useProducts();
    const refundSale = useRefundSale();
    const [qtyByLine, setQtyByLine] = useState<Record<string, string>>({});
    const [reason, setReason] = useState('');

    const lines = useMemo(
        () =>
            sale.products.map((line) => {
                const key = lineKey(line.idProduct, line.mode);
                const alreadyRefunded = getRefundedQuantity(sale, line.idProduct, line.mode);
                const max = Math.max(0, line.quantity - alreadyRefunded);
                return {line, key, max};
            }),
        [sale]
    );

    const refundAmount = lines.reduce((sum, {line, key, max}) => {
        const requested = Math.min(Number(qtyByLine[key] ?? 0) || 0, max);
        return sum + requested * line.price;
    }, 0);

    const hasAnyRefund = lines.some(({key, max}) => {
        const requested = Number(qtyByLine[key] ?? 0) || 0;
        return requested > 0 && requested <= max;
    });

    const reset = () => {
        setQtyByLine({});
        setReason('');
    };

    const handleConfirm = async () => {
        const refundLines = lines
            .filter(({key, max}) => {
                const requested = Number(qtyByLine[key] ?? 0) || 0;
                return requested > 0 && requested <= max;
            })
            .map(({line, key}) => ({
                idProduct: line.idProduct,
                name: line.name,
                quantity: Number(qtyByLine[key]),
                price: line.price,
                ...(line.mode ? {mode: line.mode} : {}),
                ...(line.unitLabel ? {unitLabel: line.unitLabel} : {}),
            }));

        // Lines referencing a since-deleted product are skipped inside
        // computeStockDeltas — the refund itself is still recorded, it just
        // can't restock a product that no longer exists.
        const stockDeltas = computeStockDeltas(refundLines, products, 1);

        await refundSale.mutateAsync({
            saleId: sale.id,
            refund: {
                date: new Date().toISOString(),
                lines: refundLines,
                amount: refundAmount,
                ...(reason.trim() ? {reason: reason.trim()} : {}),
            },
            stockDeltas,
        });
        reset();
        onOpenChange(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) reset();
                onOpenChange(next);
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Refund sale #{sale.id.slice(-6).toUpperCase()}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    {lines.map(({line, key, max}) => (
                        <div key={key} className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{line.name}</p>
                                <p className="tabular text-xs text-muted-foreground">
                                    Sold {line.quantity}
                                    {line.unitLabel ? ` ${line.unitLabel}` : ''} · {fmt(line.price)} each
                                </p>
                            </div>
                            {max === 0 ? (
                                <Badge variant="secondary">Fully refunded</Badge>
                            ) : (
                                <Input
                                    type="number"
                                    min={0}
                                    max={max}
                                    step={line.mode === 'weight' ? 0.01 : 1}
                                    placeholder="0"
                                    className="w-24"
                                    value={qtyByLine[key] ?? ''}
                                    onChange={(e) => setQtyByLine((prev) => ({...prev, [key]: e.target.value}))}
                                    aria-label={`Quantity to refund for ${line.name}`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="refund-reason">Reason (optional)</Label>
                    <Input id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)}/>
                </div>

                <div className="flex justify-between border-t pt-3 text-sm font-semibold">
                    <span>Refund total</span>
                    <span className="tabular">{fmt(refundAmount)}</span>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" disabled={!hasAnyRefund || refundSale.isPending}
                            onClick={handleConfirm}>
                        {refundSale.isPending ? 'Processing…' : 'Confirm refund'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}