'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import * as api from '@/lib/firebase/sales';
import type {Sale, SaleInput} from '@/types/sale';
import {toast} from 'sonner';

const SALES_KEY = ['sales'] as const;

export function useSales() {
    return useQuery({queryKey: SALES_KEY, queryFn: api.getSales, staleTime: 15_000});
}

export function useSale(id: string | undefined) {
    return useQuery({
        queryKey: ['sales', id],
        queryFn: () => api.getSale(id as string),
        enabled: Boolean(id),
    });
}

export function useCreateSale() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (sale: SaleInput) => api.createSale(sale),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: SALES_KEY});
        },
        // No onError toast here — PosScreen owns user-facing messaging for a
        // failed save, since it falls back to the offline queue instead of
        // just failing.
    });
}

export function useDeleteSale() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteSale(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({queryKey: SALES_KEY});
            const previous = queryClient.getQueryData<Sale[]>(SALES_KEY);
            queryClient.setQueryData<Sale[]>(SALES_KEY, (old) => old?.filter((s) => s.id !== id));
            return {previous};
        },
        onError: (_err, _id, context) => {
            queryClient.setQueryData(SALES_KEY, context?.previous);
            toast.error('Could not delete the sale. Try again.');
        },
        onSuccess: () => toast.success('Sale deleted'),
        onSettled: () => queryClient.invalidateQueries({queryKey: SALES_KEY}),
    });
}