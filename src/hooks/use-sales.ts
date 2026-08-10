'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import * as api from '@/lib/firebase/sales';
import type {SaleInput} from '@/types/sale';

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
        // just failing (see handleConfirmSale).
    });
}