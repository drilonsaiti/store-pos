'use client';

import {useState} from 'react';
import {Delete} from 'lucide-react';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {cn} from '@/lib/utils/cn';

interface Props {
    open: boolean;
    employeeName: string;
    onOpenChange: (open: boolean) => void;
    /** Return true if the PIN was correct — the dialog handles clearing/error UI either way. */
    onSubmit: (pin: string) => boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

/** Simple 4-digit touch keypad — deliberately no lockout/rate-limiting; this
 * is shift attribution, not account security (see EmployeeFormDialog note). */
export function EmployeePinDialog({
    open,
    employeeName,
    onOpenChange,
    onSubmit,
}: Props) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    const handleDigit = (digit: string) => {
        if (pin.length >= 4) return;

        const nextPin = `${pin}${digit}`;

        setError(false);

        if (nextPin.length < 4) {
            setPin(nextPin);
            return;
        }

        const ok = onSubmit(nextPin);

        if (!ok) {
            setError(true);
            setPin('');
            return;
        }

        setPin(nextPin);
    };

    const handleBackspace = () => {
        setPin((current) => current.slice(0, -1));
        setError(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xs">
                <DialogHeader>
                    <DialogTitle>Enter PIN for {employeeName}</DialogTitle>
                </DialogHeader>

                <div className="flex justify-center gap-3 py-2">
                    {[0, 1, 2, 3].map((i) => (
                        <span
                            key={i}
                            className={cn(
                                'h-3 w-3 rounded-full border-2',
                                i < pin.length
                                    ? error
                                        ? 'border-destructive bg-destructive'
                                        : 'border-primary bg-primary'
                                    : 'border-muted-foreground/40'
                            )}
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-center text-sm text-destructive">
                        Incorrect PIN, try again
                    </p>
                )}

                <div className="grid grid-cols-3 gap-2">
                    {KEYS.map((key, i) =>
                        key === 'back' ? (
                            <button
                                key={i}
                                type="button"
                                onClick={handleBackspace}
                                className="flex h-14 items-center justify-center rounded-md bg-secondary text-lg font-medium"
                                aria-label="Backspace"
                            >
                                <Delete className="h-5 w-5" />
                            </button>
                        ) : key === '' ? (
                            <div key={i} />
                        ) : (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleDigit(key)}
                                className="flex h-14 items-center justify-center rounded-md bg-secondary text-lg font-medium active:bg-secondary/70"
                            >
                                {key}
                            </button>
                        )
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}