'use client';

import {ShoppingCart} from 'lucide-react';
import {CartItemRow} from './cart-item';
import {EmptyState} from '@/components/ui/empty-state';
import {useCartStore} from '@/stores/cart-store';
import type {Product} from '@/types/product';

interface Props {
    products: Product[];
}

export function Cart({products}: Props) {
    const items = useCartStore((s) => s.items);

    if (items.length === 0) {
        return (
            <EmptyState
                icon={ShoppingCart}
                title="Your cart is empty"
                description="Scan a barcode or search for a product to begin."
            />
        );
    }

    return (
        <div className="divide-y">
            {items.map((item) => (
                <CartItemRow key={item.lineId} item={item} products={products}/>
            ))}
        </div>
    );
}