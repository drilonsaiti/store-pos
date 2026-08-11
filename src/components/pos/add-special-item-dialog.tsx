'use client';

import {useEffect, useState} from 'react';
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import type {Product} from '@/types/product';
import type {CartLineMode} from '@/types/cart';
import {useCurrency, useFormatCurrency} from '@/hooks/use-currency';
import {formatCurrency} from '@/lib/utils/currency';

interface Props {
    product: Product | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: (args: { mode: CartLineMode; quantity: number; unitPrice: number; unitLabel?: string }) => void;
}

const WEIGHT_QUICK_ADDS_KG = [0.1, 0.25, 0.5, 1];
const WEIGHT_QUICK_ADDS_G = [50, 100, 250, 500];

/**
 * Shown instead of an instant add whenever a scanned/selected product needs
 * a decision a flat "+1" can't make: how much (weight-sold items) or which
 * price applies (items sold both by the piece and by the package). Plain
 * piece-only products never trigger this — see PosScreen.
 */
export function AddSpecialItemDialog({product, onOpenChange, onConfirm}: Props) {
    const fmt = useFormatCurrency();
    const {currency} = useCurrency();
    const [weightInput, setWeightInput] = useState('');

    useEffect(() => {
        setWeightInput('');
    }, [product]);

    const open = Boolean(product);
    if (!product) return null;

    if (product.saleUnit === 'weight') {
        const unit = product.weightUnit ?? 'kg';
        const quickAdds = unit === 'g' ? WEIGHT_QUICK_ADDS_G : WEIGHT_QUICK_ADDS_KG;
        const parsedWeight = Number(weightInput);
        const isValid = Number.isFinite(parsedWeight) && parsedWeight > 0;

        const confirm = (amount: number) => {
            if (!Number.isFinite(amount) || amount <= 0) return;
            onConfirm({mode: 'weight', quantity: amount, unitPrice: product.price, unitLabel: unit});
            onOpenChange(false);
        };

        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{product.name}</DialogTitle>
                    </DialogHeader>
                    <p className="tabular text-sm text-muted-foreground">
                        {fmt(product.price)} / {unit}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                        {quickAdds.map((amount) => (
                            <Button key={amount} variant="outline" onClick={() => confirm(amount)}>
                                {amount} {unit}
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="custom-weight">Or enter exact amount ({unit})</Label>
                        <Input
                            id="custom-weight"
                            type="number"
                            step="0.01"
                            min="0"
                            autoFocus
                            value={weightInput}
                            onChange={(e) => setWeightInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && isValid) confirm(parsedWeight);
                            }}
                        />
                        {isValid && (
                            <p className="tabular text-sm text-muted-foreground">= {formatCurrency(product.price * parsedWeight, currency)}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button disabled={!isValid} onClick={() => confirm(parsedWeight)}>
                            Add to cart
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    if (product.packageOption) {
        const {piecesPerPackage, packagePrice} = product.packageOption;
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{product.name}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">How is this being sold?</p>
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            className="h-auto justify-between py-3"
                            onClick={() => {
                                onConfirm({mode: 'piece', quantity: 1, unitPrice: product.price});
                                onOpenChange(false);
                            }}
                        >
                            <span>Single piece</span>
                            <span className="tabular">{fmt(product.price)}</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto justify-between py-3"
                            onClick={() => {
                                onConfirm({
                                    mode: 'package',
                                    quantity: 1,
                                    unitPrice: packagePrice,
                                    unitLabel: `pkg of ${piecesPerPackage}`
                                });
                                onOpenChange(false);
                            }}
                        >
                            <span>Full package ({piecesPerPackage} pcs)</span>
                            <span className="tabular">{fmt(packagePrice)}</span>
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return null;
}