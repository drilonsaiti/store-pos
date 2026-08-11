'use client';

import {PauseCircle, Trash2} from 'lucide-react';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {EmptyState} from '@/components/ui/empty-state';
import {useFormatCurrency} from '@/hooks/use-currency';
import {calculateCartTotal} from '@/lib/utils/currency';
import {formatDateTime} from '@/lib/utils/dates';
import type {HeldSale} from '@/types/held-sale';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    heldSales: HeldSale[];
    onResume: (sale: HeldSale) => void;
    onDelete: (id: string) => void;
}

export function HeldSalesListDialog({open, onOpenChange, heldSales, onResume, onDelete}: Props) {
    const fmt = useFormatCurrency();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Held sales</DialogTitle>
                </DialogHeader>
                {heldSales.length === 0 ? (
                    <EmptyState icon={PauseCircle} title="No held sales"
                                description="Sales you hold will show up here."/>
                ) : (
                    <div className="flex flex-col gap-2">
                        {heldSales.map((sale) => (
                            <div key={sale.id}
                                 className="flex items-center justify-between gap-3 rounded-md border p-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{sale.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDateTime(sale.heldAt)} · {sale.items.length} line{sale.items.length === 1 ? '' : 's'} ·{' '}
                                        <span className="tabular">{fmt(calculateCartTotal(sale.items))}</span>
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <Button size="sm" onClick={() => onResume(sale)}>
                                        Resume
                                    </Button>
                                    <Button variant="ghost" size="icon" aria-label={`Delete held sale ${sale.label}`}
                                            onClick={() => onDelete(sale.id)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}