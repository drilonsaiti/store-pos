'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import * as api from '@/lib/firebase/employees';
import type {Employee, EmployeeInput} from '@/types/employee';
import {toast} from 'sonner';

const EMPLOYEES_KEY = ['employees'] as const;

export function useEmployees() {
    return useQuery({queryKey: EMPLOYEES_KEY, queryFn: api.getEmployees, staleTime: 60_000});
}

export function useCreateEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (employee: EmployeeInput) => api.createEmployee(employee),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: EMPLOYEES_KEY});
            toast.success('Employee added');
        },
        onError: () => toast.error('Could not add the employee. Try again.'),
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, employee}: { id: string; employee: Partial<EmployeeInput> }) =>
            api.updateEmployee(id, employee),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: EMPLOYEES_KEY});
            toast.success('Employee updated');
        },
        onError: () => toast.error('Could not update the employee. Try again.'),
    });
}

export function useDeleteEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteEmployee(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({queryKey: EMPLOYEES_KEY});
            const previous = queryClient.getQueryData<Employee[]>(EMPLOYEES_KEY);
            queryClient.setQueryData<Employee[]>(EMPLOYEES_KEY, (old) => old?.filter((e) => e.id !== id));
            return {previous};
        },
        onError: (_err, _id, context) => {
            queryClient.setQueryData(EMPLOYEES_KEY, context?.previous);
            toast.error('Could not delete the employee. Try again.');
        },
        onSuccess: () => toast.success('Employee deleted'),
        onSettled: () => queryClient.invalidateQueries({queryKey: EMPLOYEES_KEY}),
    });
}