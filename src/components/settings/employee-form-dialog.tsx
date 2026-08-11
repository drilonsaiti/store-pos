'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useCreateEmployee, useUpdateEmployee} from '@/hooks/use-employees';
import type {Employee} from '@/types/employee';

const employeeSchema = z
    .object({
        name: z.string().trim().min(1, 'Name is required'),
        active: z.boolean(),
        requirePin: z.boolean(),
        pin: z.string().optional(),
        confirmPin: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (!data.requirePin) return;
        if (!/^\d{4}$/.test(data.pin ?? '')) {
            ctx.addIssue({code: z.ZodIssueCode.custom, path: ['pin'], message: 'PIN must be exactly 4 digits'});
        }
        if (data.pin !== data.confirmPin) {
            ctx.addIssue({code: z.ZodIssueCode.custom, path: ['confirmPin'], message: "PINs don't match"});
        }
    });
type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee?: Employee | null;
}

export function EmployeeFormDialog({open, onOpenChange, employee}: Props) {
    const createEmployee = useCreateEmployee();
    const updateEmployee = useUpdateEmployee();
    const isEditing = Boolean(employee);
    const [requirePin, setRequirePin] = useState(Boolean(employee?.pin));

    const {
        register,
        handleSubmit,
        reset,
        formState: {errors, isSubmitting},
    } = useForm<EmployeeFormValues>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            name: employee?.name ?? '',
            active: employee?.active ?? true,
            requirePin: Boolean(employee?.pin),
            pin: '',
            confirmPin: '',
        },
    });

    useEffect(() => {
        if (open) {
            setRequirePin(Boolean(employee?.pin));
            reset({
                name: employee?.name ?? '',
                active: employee?.active ?? true,
                requirePin: Boolean(employee?.pin),
                pin: '',
                confirmPin: ''
            });
        }
    }, [open, employee, reset]);

    const submit = handleSubmit(async (values) => {
        const payload = {
            name: values.name,
            active: values.active,
            pin: values.requirePin ? (values.pin ?? null) : null,
        };
        if (isEditing && employee) {
            await updateEmployee.mutateAsync({id: employee.id, employee: payload});
        } else {
            await createEmployee.mutateAsync(payload);
        }
        onOpenChange(false);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit employee' : 'Add employee'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="employee-name">Name</Label>
                        <Input id="employee-name" autoFocus {...register('name')} aria-invalid={Boolean(errors.name)}/>
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="h-4 w-4" {...register('active')} />
                        Active (shows up in the cashier picker)
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="h-4 w-4"
                            {...register('requirePin')}
                            onChange={(e) => {
                                register('requirePin').onChange(e);
                                setRequirePin(e.target.checked);
                            }}
                        />
                        Require a PIN to select this employee
                    </label>

                    {requirePin && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="employee-pin">{employee?.pin ? 'New PIN' : 'PIN'} (4 digits)</Label>
                                <Input id="employee-pin" type="password" inputMode="numeric"
                                       maxLength={4} {...register('pin')} />
                                {errors.pin && <p className="text-sm text-destructive">{errors.pin.message}</p>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="employee-confirm-pin">Confirm PIN</Label>
                                <Input id="employee-confirm-pin" type="password" inputMode="numeric"
                                       maxLength={4} {...register('confirmPin')} />
                                {errors.confirmPin &&
                                    <p className="text-sm text-destructive">{errors.confirmPin.message}</p>}
                            </div>
                        </div>
                    )}
                    {requirePin && employee?.pin && (
                        <p className="text-xs text-muted-foreground">Leave blank and unchecked/re-checked has no effect
                            — enter a new 4-digit PIN to replace the current one.</p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add employee'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}