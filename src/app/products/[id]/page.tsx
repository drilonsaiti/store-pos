'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StockBadge } from '@/components/products/stock-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useProduct, useDeleteProduct } from '@/hooks/use-products';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/dates';
import { useState } from 'react';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useProduct(id);
  const deleteProduct = useDeleteProduct();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <AppShell title="Product">
      <div className="p-4 md:p-6">
        {isLoading && <Skeleton className="h-64 w-full max-w-xl" />}
        {!isLoading && !product && <p className="text-muted-foreground">Product not found.</p>}
        {product && (
          <Card className="max-w-xl">
            <CardContent className="pt-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{product.name}</h2>
                  <p className="tabular mt-1 text-sm text-muted-foreground">Barcode: {product.barCode}</p>
                </div>
                <StockBadge quantity={product.quantity} />
              </div>
              <dl className="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Selling price</dt>
                  <dd className="tabular font-medium">{formatCurrency(product.price)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Purchase price</dt>
                  <dd className="tabular font-medium">{formatCurrency(product.purchasePrice)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Quantity in stock</dt>
                  <dd className="tabular font-medium">{product.quantity}</dd>
                </div>
                {product.updatedAt && (
                  <div>
                    <dt className="text-muted-foreground">Last updated</dt>
                    <dd className="font-medium">{formatDateTime(product.updatedAt)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-6 flex gap-3">
                <Button asChild className="flex-1">
                  <Link href={`/products/${product.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete product?"
        description={`${product?.name ?? 'This product'} will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (!product) return;
          deleteProduct.mutate(product.id);
          router.push('/products');
        }}
      />
    </AppShell>
  );
}
