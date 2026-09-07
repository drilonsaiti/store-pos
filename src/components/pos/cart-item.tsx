'use client';

import {memo} from 'react';
import {AlertTriangle, Minus, Plus, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {CartItem as CartItemType} from '@/types/cart';
import type {Product} from '@/types/product';
import {calculateLineTotal} from '@/lib/utils/currency';
import {useFormatCurrency} from '@/hooks/use-currency';
import {useCartStore} from '@/stores/cart-store';
import {getAvailableQuantity, isLineOversold} from '@/lib/utils/stock';

interface Props {
    item: CartItemType;
    products: Product[];
}

export const CartItemRow = memo(function CartItemRow({item, products}: Props) {
    const incrementItem = useCartStore((s) => s.incrementItem);
    const decrementItem = useCartStore((s) => s.decrementItem);
    const setQuantity = useCartStore((s) => s.setQuantity);
    const removeItem = useCartStore((s) => s.removeItem);
    const fmt = useFormatCurrency();
    const isWeight = item.mode === 'weight';

    const available = getAvailableQuantity(item.productId, products);
    const missing = available === null;
    const oversold = !missing && isLineOversold(
        {productId: item.productId, quantity: item.quantity, mode: item.mode},
        products
    );

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:flex-nowrap">
            <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <p className="truncate text-sm font-medium">
                    {item.name}
                    {item.mode === 'package' && <span className="ml-1.5 text-xs text-muted-foreground">(package)</span>}
                </p>
                <p className="tabular text-xs text-muted-foreground">
                    {fmt(item.price)} {isWeight ? `/ ${item.unitLabel ?? 'kg'}` : item.mode === 'package' ? '/ package' : 'each'}
                </p>
                {missing && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3"/>
                        No longer in the catalog
                    </p>
                )}
                {!missing && oversold && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-warning">
                        <AlertTriangle className="h-3 w-3"/>
                        Only {available} in stock
                    </p>
                )}
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`Decrease quantity of ${item.name}`}
                    onClick={() => decrementItem(item.lineId)}
                >
                    <Minus className="h-4 w-4"/>
                </Button>
                <Input
                    type="number"
                    step={isWeight ? 0.01 : 1}
                    value={item.quantity}
                    onChange={(e) => setQuantity(item.lineId, Number(e.target.value) || 0)}
                    className="tabular h-9 w-20 text-center [appearance:textfield] px-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label={`Quantity of ${item.name}`}
                />
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`Increase quantity of ${item.name}`}
                    onClick={() => incrementItem(item.lineId)}
                >
                    <Plus className="h-4 w-4"/>
                </Button>
            </div>

            <p className="tabular w-16 shrink-0 text-right text-sm font-semibold sm:w-20">
                {fmt(calculateLineTotal(item.price, item.quantity))}
            </p>

            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground"
                aria-label={`Remove ${item.name} from cart`}
                onClick={() => removeItem(item.lineId)}
            >
                <X className="h-4 w-4"/>
            </Button>
        </div>
    );
});