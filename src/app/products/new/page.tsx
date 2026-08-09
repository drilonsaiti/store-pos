'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { ProductForm } from '@/components/products/product-form';
import { useCreateProduct } from '@/hooks/use-products';
import type { ProductFormValues } from '@/lib/validation/product-schema';
import type { Product } from '@/types/product';

function NewProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createProduct = useCreateProduct();
  const prefillBarcode = searchParams.get('barcode') ?? undefined;

  const handleSubmit = async (values: ProductFormValues) => {
    await createProduct.mutateAsync(values);
    router.push('/products');
  };

  return (
    <ProductForm
      product={prefillBarcode ? ({ barCode: prefillBarcode } as Product) : undefined}
      onSubmit={handleSubmit}
      submitLabel="Add product"
    />
  );
}

export default function NewProductPage() {
  return (
    <AppShell title="Add product">
      <div className="p-4 md:p-6">
        {/* useSearchParams requires a Suspense boundary in static export mode */}
        <Suspense fallback={null}>
          <NewProductForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
