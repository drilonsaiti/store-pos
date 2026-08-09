'use client';

import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { ProductForm } from '@/components/products/product-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useProduct, useUpdateProduct } from '@/hooks/use-products';
import type { ProductFormValues } from '@/lib/validation/product-schema';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useProduct(id);
  const updateProduct = useUpdateProduct();

  const handleSubmit = async (values: ProductFormValues) => {
    await updateProduct.mutateAsync({ id, product: values });
    router.push(`/products/${id}`);
  };

  return (
    <AppShell title="Edit product">
      <div className="p-4 md:p-6">
        {isLoading && <Skeleton className="mx-auto h-96 w-full max-w-xl" />}
        {product && <ProductForm product={product} onSubmit={handleSubmit} submitLabel="Save changes" />}
      </div>
    </AppShell>
  );
}
