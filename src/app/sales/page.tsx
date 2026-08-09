'use client';

import { useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { SalesTable } from '@/components/sales/sales-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useSales } from '@/hooks/use-sales';
import { isToday } from '@/lib/utils/dates';

type DateFilter = 'all' | 'today';

export default function SalesPage() {
  const { data: sales, isLoading, isError } = useSales();
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const filtered = useMemo(() => {
    if (!sales) return [];
    return sales
      .filter((s) => (dateFilter === 'today' ? isToday(s.date) : true))
      .filter((s) => (query ? s.id.toLowerCase().includes(query.toLowerCase()) : true));
  }, [sales, query, dateFilter]);

  return (
    <AppShell title="Sales">
      <div className="p-4 md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by sale ID"
            className="sm:max-w-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('all')}
              className={`h-9 rounded-md px-3 text-sm font-medium ${dateFilter === 'all' ? 'bg-secondary' : 'text-muted-foreground'}`}
            >
              All time
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`h-9 rounded-md px-3 text-sm font-medium ${dateFilter === 'today' ? 'bg-secondary' : 'text-muted-foreground'}`}
            >
              Today
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {isError && <EmptyState icon={Receipt} title="Could not load sales" description="Check your connection and try again." />}

        {!isLoading && !isError && sales?.length === 0 && (
          <EmptyState icon={Receipt} title="No sales yet" description="Completed sales will appear here." />
        )}

        {!isLoading && !isError && (sales?.length ?? 0) > 0 && filtered.length === 0 && (
          <EmptyState icon={Receipt} title="No matches" description="Try a different search or filter." />
        )}

        {filtered.length > 0 && <SalesTable sales={filtered} />}
      </div>
    </AppShell>
  );
}
