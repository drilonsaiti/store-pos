'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {NAV_ITEMS} from '@/lib/nav';
import {cn} from '@/lib/utils/cn';
import {ScanBarcode} from 'lucide-react';

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
            <div className="flex h-16 items-center gap-2 border-b px-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <ScanBarcode className="h-4 w-4"/>
                </div>
                <span className="font-semibold tracking-tight">Store Console</span>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
                {NAV_ITEMS.map((item) => {
                    const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                                active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                            )}
                        >
                            <Icon className="h-[18px] w-[18px]"/>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}