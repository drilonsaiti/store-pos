'use client';

import Link from 'next/link';
import {Pencil, Trash2} from 'lucide-react';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Button} from '@/components/ui/button';
import {StockBadge} from './stock-badge';
import type {Product} from '@/types/product';
import {useFormatCurrency} from '@/hooks/use-currency';

interface Props {
    products: Product[];
    onDelete: (product: Product) => void;
}

export function ProductTable({products, onDelete}: Props) {
    const fmt = useFormatCurrency();

    return (
        <div className="hidden rounded-lg border md:block">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead className="text-right">Selling price</TableHead>
                        <TableHead className="text-right">Purchase price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => (
                        <TableRow key={product.id}>
                            <TableCell className="font-medium">
                                <Link href={`/products/${product.id}`} className="hover:underline">
                                    {product.name}
                                </Link>
                            </TableCell>
                            <TableCell className="tabular text-muted-foreground">{product.barCode}</TableCell>
                            <TableCell className="tabular text-right">{fmt(product.price)}</TableCell>
                            <TableCell
                                className="tabular text-right text-muted-foreground">{fmt(product.purchasePrice)}</TableCell>
                            <TableCell className="tabular text-right">{product.quantity}</TableCell>
                            <TableCell>
                                <StockBadge quantity={product.quantity}/>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" asChild aria-label={`Edit ${product.name}`}>
                                        <Link href={`/products/${product.id}/edit`}>
                                            <Pencil className="h-4 w-4"/>
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Delete ${product.name}`}
                                        onClick={() => onDelete(product)}
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}