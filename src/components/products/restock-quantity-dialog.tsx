'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Product } from '@/types/product';

interface Props {
    product: Product | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: (amountToAdd: number) => void;
}

const QUICK_PIECE_AMOUNTS = [1, 5, 10, 24];

export function RestockQuantityDialog({ product, onOpenChange, onConfirm }: Props) {
    const [amount, setAmount] = useState('');

    useEffect(() => {
        setAmount(product?.saleUnit === 'weight' ? '' : '1');
    }, [product]);

    if (!product) return null;
    const isWeight = product.saleUnit === 'weight';
    const parsed = Number(amount);
    const isValid = Number.isFinite(parsed) && parsed > 0;

    const confirm = () => {
        if (!isValid) return;
        onConfirm(parsed);
    };

    return (
        <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                </DialogHeader>
                <p className="tabular text-sm text-muted-foreground">
                    Current stock: {product.quantity} {isWeight ? (product.weightUnit ?? 'kg') : 'pcs'}
                </p>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="restock-amount">
                        Amount to add {isWeight ? `(${product.weightUnit ?? 'kg'})` : ''}
                    </Label>
                    <Input
                        id="restock-amount"
                        type="number"
                        step={isWeight ? '0.01' : '1'}
                        min="0"
                        autoFocus
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && isValid) confirm();
                        }}
                    />
                </div>

                {!isWeight && (
                    <div className="flex flex-wrap gap-2">
                        {QUICK_PIECE_AMOUNTS.map((n) => (
                            <Button key={n} type="button" variant="outline" size="sm" onClick={() => setAmount(String(n))}>
                                +{n}
                            </Button>
                        ))}
                    </div>
                )}

                {isValid && (
                    <p className="tabular text-sm text-muted-foreground">
                        New total: {Math.round((product.quantity + parsed) * 1000) / 1000} {isWeight ? (product.weightUnit ?? 'kg') : 'pcs'}
                    </p>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button disabled={!isValid} onClick={confirm}>
                        Add stock
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}