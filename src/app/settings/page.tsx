'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <AppShell title="Settings">
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 pt-0">
            {THEMES.map((t) => (
              <Button
                key={t.value}
                variant="outline"
                className={cn('flex-1', mounted && theme === t.value && 'border-primary text-primary')}
                onClick={() => setTheme(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Low-stock threshold is currently fixed at 5 units. Make this configurable per catalog by
            editing <code className="tabular">LOW_STOCK_THRESHOLD</code> in{' '}
            <code className="tabular">src/types/product.ts</code>.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
