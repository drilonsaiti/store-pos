'use client';

import {useState} from 'react';
import {Pencil, Plus, Trash2, UsersRound} from 'lucide-react';
import {AppShell} from '@/components/layout/app-shell';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import {EmptyState} from '@/components/ui/empty-state';
import {ConfirmDialog} from '@/components/ui/confirm-dialog';
import {EmployeeFormDialog} from '@/components/settings/employee-form-dialog';
import {useDeleteEmployee, useEmployees} from '@/hooks/use-employees';
import type {Employee} from '@/types/employee';

export default function EmployeesPage() {
    const {data: employees, isLoading} = useEmployees();
    const deleteEmployee = useDeleteEmployee();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Employee | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Employee | null>(null);

    return (
        <AppShell title="Employees">
            <div className="p-4 md:p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        Employees appear in the cashier picker in the top bar — sales made while one is selected get
                        tagged with
                        their name for the end-of-day report.
                    </p>
                    <Button
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4"/>
                        Add
                    </Button>
                </div>

                {isLoading && (
                    <div className="flex flex-col gap-3">
                        {Array.from({length: 3}).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full"/>
                        ))}
                    </div>
                )}

                {!isLoading && employees?.length === 0 && (
                    <EmptyState
                        icon={UsersRound}
                        title="No employees yet"
                        description="Add your team so sales can be attributed to whoever's on the register."
                        action={
                            <Button
                                onClick={() => {
                                    setEditing(null);
                                    setFormOpen(true);
                                }}
                            >
                                Add employee
                            </Button>
                        }
                    />
                )}

                <div className="flex flex-col gap-3">
                    {employees?.map((employee) => (
                        <Card key={employee.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{employee.name}</span>
                                    <Badge variant={employee.active ? 'success' : 'secondary'}>
                                        {employee.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Edit ${employee.name}`}
                                        onClick={() => {
                                            setEditing(employee);
                                            setFormOpen(true);
                                        }}
                                    >
                                        <Pencil className="h-4 w-4"/>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Delete ${employee.name}`}
                                        onClick={() => setPendingDelete(employee)}
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <EmployeeFormDialog key={formOpen ? editing?.id ?? 'new' : 'closed'} open={formOpen} onOpenChange={setFormOpen} employee={editing}/>
            <ConfirmDialog
                open={Boolean(pendingDelete)}
                onOpenChange={(open) => !open && setPendingDelete(null)}
                title="Delete employee?"
                description={`${pendingDelete?.name ?? 'This employee'} will be removed from the cashier picker. Past sales already tagged with their name keep that name.`}
                confirmLabel="Delete"
                onConfirm={() => pendingDelete && deleteEmployee.mutate(pendingDelete.id)}
            />
        </AppShell>
    );
}