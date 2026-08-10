'use client';

import {RefreshCw, WifiOff} from 'lucide-react';
import {useOfflineSaleQueue} from '@/hooks/use-offline-sale-queue';

/** Sits above the page content in AppShell — silent when online with nothing pending. */
export function OfflineBanner() {
    const {pendingCount, status, isOnline} = useOfflineSaleQueue();

    if (isOnline && pendingCount === 0) return null;

    return (
        <div
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
                !isOnline ? 'bg-warning/15 text-warning' : 'bg-accent text-accent-foreground'
            }`}
            role="status"
        >
            {!isOnline ? (
                <>
                    <WifiOff className="h-4 w-4"/>
                    Offline — sales will be saved locally and synced automatically
                    {pendingCount > 0 && ` (${pendingCount} pending)`}
                </>
            ) : status === 'syncing' ? (
                <>
                    <RefreshCw className="h-4 w-4 animate-spin"/>
                    Syncing {pendingCount} offline sale{pendingCount === 1 ? '' : 's'}…
                </>
            ) : (
                <>{pendingCount} sale{pendingCount === 1 ? '' : 's'} waiting to sync</>
            )}
        </div>
    );
}