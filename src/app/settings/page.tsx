'use client';

import {useTheme} from 'next-themes';
import {useEffect, useState} from 'react';
import {AppShell} from '@/components/layout/app-shell';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {cn} from '@/lib/utils/cn';
import {useLowStockThreshold} from '@/hooks/use-low-stock-threshold';

const THEMES = [
    {value: 'light', label: 'Light'},
    {value: 'dark', label: 'Dark'},
    {value: 'system', label: 'System'},
] as const;

export default function SettingsPage() {
    const {theme, setTheme} = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const {threshold, setThreshold} = useLowStockThreshold();
    const [draft, setDraft] = useState<string>(String(threshold));
    useEffect(() => setDraft(String(threshold)), [threshold]);

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
                    <CardContent className="flex flex-col gap-2 pt-0">
                        <Label htmlFor="low-stock-threshold">Low-stock threshold (units)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="low-stock-threshold"
                                type="number"
                                min={0}
                                step={1}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                className="max-w-[120px]"
                            />
                            <Button
                                variant="outline"
                                onClick={() => setThreshold(Number(draft))}
                                disabled={Number(draft) === threshold || draft.trim() === ''}
                            >
                                Save
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Products at or below this quantity show as &quot;Low stock&quot; across Products, the POS,
                            and the dashboard.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}