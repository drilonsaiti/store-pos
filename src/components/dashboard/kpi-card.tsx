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
            <CardContent className="flex items-center justify-between p-5">
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
                </div>
                <div
                    className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-md',
                        tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-accent text-accent-foreground'
                    )}
                >
                    <Icon className="h-5 w-5"/>
                </div>
            </CardContent>
        </Card>
    );
}
