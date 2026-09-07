'use client';

import {useState} from 'react';
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (label: string) => void;
    suggestedLabel: string;
}

export function HoldSaleDialog({open, onOpenChange, onConfirm, suggestedLabel}: Props) {
    const [label, setLabel] = useState(suggestedLabel);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hold this sale</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="hold-label">
                        Label (helps you find it again)
                    </Label>

                    <Input
                        id="hold-label"
                        autoFocus
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onConfirm(label.trim() || suggestedLabel);
                                onOpenChange(false);
                            }
                        }}
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={() => {
                            onConfirm(label.trim() || suggestedLabel);
                            onOpenChange(false);
                        }}
                    >
                        Hold sale
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
