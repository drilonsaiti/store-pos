'use client';

import Link from 'next/link';
import {Trash2} from 'lucide-react';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import type {Sale} from '@/types/sale';
import {formatDateTime} from '@/lib/utils/dates';
import {useFormatCurrency} from '@/hooks/use-currency';
import {getSaleRefundedTotal} from '@/lib/utils/refund';
import {Badge} from '@/components/ui/badge';

interface Props {
    sales: Sale[];
    onDelete: (sale: Sale) => void;
}

export function SalesTable({sales, onDelete}: Props) {
    const fmt = useFormatCurrency();

    return (
        <>
            <div className="hidden rounded-lg border md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sale</TableHead>
                            <TableHead>Date &amp; time</TableHead>
                            <TableHead className="text-right">Products</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/sales/${sale.id}`} className="hover:underline">
                                        #{sale.id.slice(-6).toUpperCase()}
                                    </Link>
                                </TableCell>
                                <TableCell>{formatDateTime(sale.date)}</TableCell>
                                <TableCell className="tabular text-right">{sale.products?.length ?? 0}</TableCell>
                                <TableCell className="tabular text-right">{sale.totalQuantity ?? 0}</TableCell>
                                <TableCell className="tabular text-right font-medium">
                                    {fmt(sale.totalPrice)}
                                    {getSaleRefundedTotal(sale) > 0 && (
                                        <Badge variant="warning" className="ml-2">
                                            {getSaleRefundedTotal(sale) >= sale.totalPrice ? 'Refunded' : 'Partial refund'}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Delete sale #${sale.id.slice(-6).toUpperCase()}`}
                                        onClick={() => onDelete(sale)}
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
                {sales.map((sale) => (
                    <Card key={sale.id} className="p-4">
                        <div className="flex items-center justify-between">
                            <Link href={`/sales/${sale.id}`} className="font-medium hover:underline">
                                #{sale.id.slice(-6).toUpperCase()}
                            </Link>
                            <div className="flex items-center gap-2">
                                <span className="tabular font-semibold">{fmt(sale.totalPrice)}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label={`Delete sale #${sale.id.slice(-6).toUpperCase()}`}
                                    onClick={() => onDelete(sale)}
                                >
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                        <Link href={`/sales/${sale.id}`}
                              className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                            <span>{formatDateTime(sale.date)}</span>
                            <span className="tabular">{sale.totalQuantity ?? 0} items</span>
                        </Link>
                    </Card>
                ))}
            </div>
        </>
    );
}