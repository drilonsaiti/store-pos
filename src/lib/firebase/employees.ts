import {child, get, push, ref, remove, set, update} from 'firebase/database';
import {FirebaseUnavailableError, getDb} from './client';
import type {Employee, EmployeeInput} from '@/types/employee';

const PATH = 'employees';

export async function getEmployees(): Promise<Employee[]> {
    try {
        const snapshot = await get(ref(getDb(), PATH));
        const value = snapshot.val() as Record<string, Omit<Employee, 'id'>> | null;
        if (!value) return [];
        return Object.entries(value)
            .map(([id, raw]) => ({id, ...raw}))
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function createEmployee(employee: EmployeeInput): Promise<Employee> {
    try {
        const newRef = push(ref(getDb(), PATH));
        const payload = {...employee, createdAt: new Date().toISOString()};
        await set(newRef, payload);
        return {id: newRef.key as string, ...payload};
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function updateEmployee(id: string, employee: Partial<EmployeeInput>): Promise<void> {
    try {
        await update(child(ref(getDb(), PATH), id), employee);
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}

export async function deleteEmployee(id: string): Promise<void> {
    try {
        await remove(child(ref(getDb(), PATH), id));
    } catch (error) {
        throw new FirebaseUnavailableError(error);
    }
}