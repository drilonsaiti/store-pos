'use client';

import { ShoppingCart } from 'lucide-react';
import { CartItemRow } from './cart-item';
import { EmptyState } from '@/components/ui/empty-state';
import { useCartStore } from '@/stores/cart-store';

export function Cart() {
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
        <CartItemRow key={item.productId} item={item} />
      ))}
    </div>
  );
}
