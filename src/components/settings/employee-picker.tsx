'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Check, UsersRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {EmployeePinDialog} from './employee-pin-dialog';
import {useEmployees} from '@/hooks/use-employees';
import {useCurrentEmployee} from '@/hooks/use-current-employee';
import type {Employee} from '@/types/employee';

export function EmployeePicker() {
    const {data: employees} = useEmployees();
    const {employee, setEmployee} = useCurrentEmployee();
    const active = (employees ?? []).filter((e) => e.active);
    const [pinTarget, setPinTarget] = useState<Employee | null>(null);

    const selectEmployee = (e: Employee) => {
        if (e.pin) {
            setPinTarget(e);
        } else {
            setEmployee({id: e.id, name: e.name});
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"
                            aria-label={employee ? `Cashier: ${employee.name}` : 'Select cashier'}>
                        <UsersRound className="h-[18px] w-[18px]"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem]">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Cashier</div>
                    {active.length === 0 &&
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No employees yet</div>}
                    {active.map((e) => (
                        <DropdownMenuItem key={e.id} onClick={() => selectEmployee(e)}>
                            <span className="flex-1">{e.name}</span>
                            {e.pin && employee?.id !== e.id &&
                                <span className="text-xs text-muted-foreground">PIN</span>}
                            {employee?.id === e.id && <Check className="h-4 w-4"/>}
                        </DropdownMenuItem>
                    ))}
                    {employee && (
                        <DropdownMenuItem onClick={() => setEmployee(null)} className="text-muted-foreground">
                            Clear selection
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                        <Link href="/settings/employees">Manage employees</Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EmployeePinDialog
                key={pinTarget?.id ?? 'none'} open={Boolean(pinTarget)}
                employeeName={pinTarget?.name ?? ''} onOpenChange={(open) => !open && setPinTarget(null)}
                onSubmit={(pin) => {
                    if (!pinTarget) return false;
                    const correct = pin === pinTarget.pin;
                    if (correct) {
                        setEmployee({id: pinTarget.id, name: pinTarget.name,});
                        setPinTarget(null);
                    }
                    return correct;
                }}/>
        </>
    );
}