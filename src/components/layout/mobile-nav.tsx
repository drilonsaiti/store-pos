'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_NAV_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/utils/cn';

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 backdrop-blur md:hidden">
      {MOBILE_NAV_ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const isPos = item.href === '/sale';
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                isPos && 'bg-primary text-primary-foreground'
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
