'use client';

import Link from 'next/link';
import {Pencil, Trash2} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {StockBadge} from './stock-badge';
import type {Product} from '@/types/product';
import {useFormatCurrency} from '@/hooks/use-currency';

interface Props {
    products: Product[];
    onDelete: (product: Product) => void;
}

export function ProductCardList({products, onDelete}: Props) {
    const fmt = useFormatCurrency();

    return (
        <div className="flex flex-col gap-3 md:hidden">
            {products.map((product) => (
                <Card key={product.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <Link href={`/products/${product.id}`} className="block truncate font-medium">
                                {product.name}
                            </Link>
                            <p className="tabular mt-0.5 text-sm text-muted-foreground">{product.barCode}</p>
                        </div>
                        <StockBadge quantity={product.quantity}/>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                        <div>
                            <p className="tabular text-lg font-semibold">{fmt(product.price)}</p>
                            <p className="tabular text-xs text-muted-foreground">
                                Stock: {product.quantity} · Cost {fmt(product.purchasePrice)}
                            </p>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon" asChild aria-label={`Edit ${product.name}`}>
                                <Link href={`/products/${product.id}/edit`}>
                                    <Pencil className="h-4 w-4"/>
                                </Link>
                            </Button>
                            <Button variant="outline" size="icon" aria-label={`Delete ${product.name}`}
                                    onClick={() => onDelete(product)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}