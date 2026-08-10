import type {LucideIcon} from 'lucide-react';
import {cn} from '@/lib/utils/cn';

interface Props {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({icon: Icon, title, description, action, className}: Props) {
    return (
        <div
            className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center', className)}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Icon className="h-6 w-6 text-muted-foreground"/>
            </div>
            <div className="max-w-xs">
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            {action}
        </div>
    );
}
