'use client';

import {useParams, useRouter} from 'next/navigation';
import {useState} from 'react';
import {Printer, Trash2, Undo2} from 'lucide-react';
import {AppShell} from '@/components/layout/app-shell';
import {Card, CardContent} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Skeleton} from '@/components/ui/skeleton';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {ConfirmDialog} from '@/components/ui/confirm-dialog';
import {RefundDialog} from '@/components/sales/refund-dialog';
import {useDeleteSale, useSale} from '@/hooks/use-sales';
import {useFormatCurrency} from '@/hooks/use-currency';
import {formatDateTime} from '@/lib/utils/dates';
import {getSaleNetTotal, getSaleRefundedTotal} from '@/lib/utils/refund';

export default function SaleDetailPage() {
    const {id} = useParams<{ id: string }>();
    const router = useRouter();
    const {data: sale, isLoading} = useSale(id);
    const deleteSale = useDeleteSale();
    const fmt = useFormatCurrency();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [refundOpen, setRefundOpen] = useState(false);

    return (
        <AppShell title="Sale details">
            <div className="p-4 md:p-6">
                {isLoading && <Skeleton className="h-72 w-full max-w-2xl"/>}
                {!isLoading && !sale && <p className="text-muted-foreground">Sale not found.</p>}
                {sale && (
                    <Card className="max-w-2xl">
                        <CardContent className="pt-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">Sale #{sale.id.slice(-6).toUpperCase()}</h2>
                                    {sale.employeeName &&
                                        <p className="text-sm text-muted-foreground">Cashier: {sale.employeeName}</p>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground">{formatDateTime(sale.date)}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label="Print receipt"
                                        onClick={() => window.open(`/print/receipt/${sale.id}`, '_blank')}
                                    >
                                        <Printer className="h-4 w-4"/>
                                    </Button>
                                    <Button variant="outline" size="icon" aria-label="Refund"
                                            onClick={() => setRefundOpen(true)}>
                                        <Undo2 className="h-4 w-4"/>
                                    </Button>
                                    <Button variant="outline" size="icon" aria-label="Delete sale"
                                            onClick={() => setConfirmOpen(true)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Unit price</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sale.products.map((line, i) => (
                                        <TableRow key={`${line.idProduct}-${i}`}>
                                            <TableCell>
                                                {line.name}
                                                {line.unitLabel && <span
                                                    className="ml-1 text-xs text-muted-foreground">({line.unitLabel})</span>}
                                            </TableCell>
                                            <TableCell className="tabular text-right">{fmt(line.price)}</TableCell>
                                            <TableCell className="tabular text-right">{line.quantity}</TableCell>
                                            <TableCell
                                                className="tabular text-right font-medium">{fmt(line.price * line.quantity)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {sale.refunds && sale.refunds.length > 0 && (
                                <div className="mt-4 border-t pt-4">
                                    <h3 className="mb-2 text-sm font-medium">Refunds</h3>
                                    <div className="flex flex-col gap-2">
                                        {sale.refunds.map((refund) => (
                                            <div key={refund.id} className="rounded-md bg-secondary p-3 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className="text-muted-foreground">{formatDateTime(refund.date)}</span>
                                                    <span className="tabular font-medium">-{fmt(refund.amount)}</span>
                                                </div>
                                                {refund.reason &&
                                                    <p className="mt-1 text-xs text-muted-foreground">{refund.reason}</p>}
                                                <ul className="mt-1 text-xs text-muted-foreground">
                                                    {refund.lines.map((l, i) => (
                                                        <li key={i}>
                                                            {l.name} × {l.quantity}
                                                            {l.unitLabel ? ` ${l.unitLabel}` : ''}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 flex justify-end border-t pt-4">
                                <div className="text-right">
                                    {getSaleRefundedTotal(sale) > 0 ? (
                                        <>
                                            <p className="text-sm text-muted-foreground">
                                                Original {fmt(sale.totalPrice)} · Refunded
                                                -{fmt(getSaleRefundedTotal(sale))}
                                            </p>
                                            <p className="tabular text-2xl font-semibold">{fmt(getSaleNetTotal(sale))}</p>
                                            <Badge variant="warning" className="mt-1">
                                                {getSaleRefundedTotal(sale) >= sale.totalPrice ? 'Fully refunded' : 'Partially refunded'}
                                            </Badge>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-muted-foreground">Total</p>
                                            <p className="tabular text-2xl font-semibold">{fmt(sale.totalPrice)}</p>
                                            {typeof sale.amountReceived === 'number' && (
                                                <p className="tabular mt-1 text-xs text-muted-foreground">
                                                    Cash {fmt(sale.amountReceived)} · Change {fmt(sale.changeDue ?? 0)}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {sale && <RefundDialog sale={sale} open={refundOpen} onOpenChange={setRefundOpen}/>}

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete sale?"
                description={`Sale #${sale?.id.slice(-6).toUpperCase() ?? ''} will be permanently removed.`}
                confirmLabel="Delete"
                onConfirm={() => {
                    if (!sale) return;
                    deleteSale.mutate(sale.id);
                    router.push('/sales');
                }}
            />
        </AppShell>
    );
}