'use client';

import { Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CartItem as CartItemType } from '@/types/cart';
import { calculateLineTotal, formatCurrency } from '@/lib/utils/currency';
import { useCartStore } from '@/stores/cart-store';

export function CartItemRow({ item }: { item: CartItemType }) {
  const { incrementItem, decrementItem, setQuantity, removeItem } = useCartStore();

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="tabular text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          aria-label={`Decrease quantity of ${item.name}`}
          onClick={() => decrementItem(item.productId)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={item.quantity}
          onChange={(e) => setQuantity(item.productId, Number(e.target.value) || 0)}
          className="tabular h-9 w-14 text-center [appearance:textfield] px-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={`Quantity of ${item.name}`}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          aria-label={`Increase quantity of ${item.name}`}
          onClick={() => incrementItem(item.productId)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <p className="tabular w-20 text-right text-sm font-semibold">
        {formatCurrency(calculateLineTotal(item.price, item.quantity))}
      </p>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground"
        aria-label={`Remove ${item.name} from cart`}
        onClick={() => removeItem(item.productId)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
