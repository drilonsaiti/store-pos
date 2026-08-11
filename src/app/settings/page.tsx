'use client';

import {useTheme} from 'next-themes';
import {useEffect, useState} from 'react';
import {AppShell} from '@/components/layout/app-shell';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils/cn';
import {useLowStockThreshold} from '@/hooks/use-low-stock-threshold';
import {useCurrency} from '@/hooks/use-currency';
import {SUPPORTED_CURRENCIES} from '@/lib/utils/currency';
import {useCameraPermission} from '@/hooks/use-camera-permission';
import Link from 'next/link';
import {FileBarChart, UsersRound} from 'lucide-react';

const THEMES = [
    {value: 'light', label: 'Light'},
    {value: 'dark', label: 'Dark'},
    {value: 'system', label: 'System'},
] as const;

const CAMERA_STATUS_LABEL: Record<string, string> = {
    granted: 'Granted — camera scanning will not ask again on this device',
    denied: 'Blocked — re-enable camera access for this site in browser settings',
    prompt: 'Not yet granted — you will be asked the first time you scan',
    unknown: 'Cannot be checked on this browser — Safari does not support querying it in advance',
};

export default function SettingsPage() {
    const {theme, setTheme} = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const {threshold, setThreshold} = useLowStockThreshold();
    const [draft, setDraft] = useState<string>(String(threshold));
    useEffect(() => setDraft(String(threshold)), [threshold]);

    const {currency, setCurrency} = useCurrency();
    const cameraPermission = useCameraPermission();

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
                        <CardTitle>Currency</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 pt-0">
                        {SUPPORTED_CURRENCIES.map((code) => (
                            <Button
                                key={code}
                                variant="outline"
                                className={cn(currency === code && 'border-primary text-primary')}
                                onClick={() => setCurrency(code)}
                            >
                                {code}
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

                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Camera access</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 pt-0">
                        <div className="flex items-center gap-2">
                            <Badge
                                variant={cameraPermission === 'granted' ? 'success' : cameraPermission === 'denied' ? 'destructive' : 'secondary'}>
                                {cameraPermission}
                            </Badge>
                            <span
                                className="text-sm text-muted-foreground">{CAMERA_STATUS_LABEL[cameraPermission]}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Once granted, the browser remembers this for the site automatically — it will not ask again
                            on the same
                            device, as long as the store is always opened at the same web address. Opening it from a
                            different or
                            changing address (e.g. a LAN IP instead of a fixed domain) is treated as a different site
                            and will ask
                            again; this is a browser security rule, not something the app controls.
                        </p>
                    </CardContent>
                </Card>

                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Team</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Button asChild variant="outline" className="w-full justify-start">
                            <Link href="/settings/employees">
                                <UsersRound className="h-4 w-4"/>
                                Manage employees
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Button asChild variant="outline" className="w-full justify-start">
                            <Link href="/reports/end-of-day">
                                <FileBarChart className="h-4 w-4"/>
                                End of day report
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}