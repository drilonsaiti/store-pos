import type {LucideIcon} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/card';
import {cn} from '@/lib/utils/cn';

interface Props {
    label: string;
    value: string;
    icon: LucideIcon;
    tone?: 'default' | 'warning';
}

export function KpiCard({label, value, icon: Icon, tone = 'default'}: Props) {
    return (
        <Card>
            <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
                    <p className="tabular mt-1 break-words text-xl font-semibold leading-tight sm:text-2xl">
                        {value}
                    </p>
                </div>
                <div
                    className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md sm:h-10 sm:w-10',
                        tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-accent text-accent-foreground'
                    )}
                >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5"/>
                </div>
            </CardContent>
        </Card>
    );
}