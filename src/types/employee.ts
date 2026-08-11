export interface Employee {
    id: string;
    name: string;
    active: boolean;
    pin?: string | null;
    createdAt?: string;
}

export type EmployeeInput = Omit<Employee, 'id' | 'createdAt'>;