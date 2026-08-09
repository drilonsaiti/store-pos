'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { productSchema, type ProductFormValues } from '@/lib/validation/product-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { Product } from '@/types/product';

interface Props {
  product?: Product;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  submitLabel: string;
}

export function ProductForm({ product, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      barCode: product?.barCode ?? '',
      price: product?.price ?? 0,
      purchasePrice: product?.purchasePrice ?? 0,
      quantity: product?.quantity ?? 0,
    },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="pt-5">
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" autoFocus {...register('name')} aria-invalid={Boolean(errors.name)} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="barCode">Barcode</Label>
            <Input id="barCode" inputMode="numeric" className="tabular" {...register('barCode')} aria-invalid={Boolean(errors.barCode)} />
            <p className="text-xs text-muted-foreground">Stored as text — leading zeroes are preserved.</p>
            {errors.barCode && <p className="text-sm text-destructive">{errors.barCode.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Selling price (€)</Label>
              <Input id="price" type="number" step="0.01" min="0" {...register('price')} aria-invalid={Boolean(errors.price)} />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purchasePrice">Purchase price (€)</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                {...register('purchasePrice')}
                aria-invalid={Boolean(errors.purchasePrice)}
              />
              {errors.purchasePrice && <p className="text-sm text-destructive">{errors.purchasePrice.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" step="1" min="0" {...register('quantity')} aria-invalid={Boolean(errors.quantity)} />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving…' : submitLabel}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
