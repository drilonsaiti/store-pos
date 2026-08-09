'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function ProductSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name or barcode"
        className="pl-9"
        aria-label="Search products"
      />
    </div>
  );
}
