'use client';

import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import * as api from '@/lib/firebase/products';
import type {Product, ProductInput} from '@/types/product';
import {buildBarcodeIndex} from '@/lib/utils/barcode';
import {toast} from 'sonner';

const PRODUCTS_KEY = ['products'] as const;

export function useProducts() {
    return useQuery({
        queryKey: PRODUCTS_KEY,
        queryFn: api.getProducts,
        staleTime: 30_000,
    });
}

export function useProduct(id: string | undefined) {
    return useQuery({
        queryKey: ['products', id],
        queryFn: () => api.getProduct(id as string),
        enabled: Boolean(id),
    });
}

/** O(1) barcode -> product map, memoized off the live products query. */
export function useBarcodeIndex() {
    const {data: products} = useProducts();
    return useMemo(() => buildBarcodeIndex(products ?? []), [products]);
}

export function useCreateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (product: ProductInput) => api.createProduct(product),
        onSuccess: (created) => {
            queryClient.setQueryData<Product[]>(PRODUCTS_KEY, (old) => (old ? [created, ...old] : [created]));
            toast.success('Product added');
        },
        onError: () => toast.error('Could not add the product. Try again.'),
    });
}

export function useBulkCreateProducts() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (products: ProductInput[]) => api.bulkCreateProducts(products),
        onSuccess: (created) => {
            queryClient.setQueryData<Product[]>(PRODUCTS_KEY, (old) => (old ? [...created, ...old] : created));
            toast.success(`Imported ${created.length} product${created.length === 1 ? '' : 's'}`);
        },
        onError: () => toast.error('Import failed. No products were saved.'),
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, product}: { id: string; product: Partial<ProductInput> }) =>
            api.updateProduct(id, product),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: PRODUCTS_KEY});
            toast.success('Product updated');
        },
        onError: () => toast.error('Could not update the product. Try again.'),
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteProduct(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({queryKey: PRODUCTS_KEY});
            const previous = queryClient.getQueryData<Product[]>(PRODUCTS_KEY);
            queryClient.setQueryData<Product[]>(PRODUCTS_KEY, (old) => old?.filter((p) => p.id !== id));
            return {previous};
        },
        onError: (_err, _id, context) => {
            queryClient.setQueryData(PRODUCTS_KEY, context?.previous);
            toast.error('Could not delete the product. Try again.');
        },
        onSuccess: () => toast.success('Product deleted'),
        onSettled: () => queryClient.invalidateQueries({queryKey: PRODUCTS_KEY}),
    });
}

export function useIncrementProductQuantity() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, delta }: { id: string; delta: number }) => api.incrementProductQuantity(id, delta),
        onSuccess: (newQuantity, { id }) => {
            queryClient.setQueryData<Product[]>(PRODUCTS_KEY, (old) =>
                old?.map((p) => (p.id === id ? { ...p, quantity: newQuantity } : p))
            );
            queryClient.invalidateQueries({ queryKey: ['products', id] });
        },
        onError: () => toast.error('Could not update stock. Try again.'),
    });
}