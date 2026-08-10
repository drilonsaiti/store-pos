'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {dequeueSale, getQueuedSales, type QueuedSale} from '@/lib/offline/sale-queue';
import * as salesApi from '@/lib/firebase/sales';
import {useOnlineStatus} from './use-online-status';
import {toast} from 'sonner';

export type SyncStatus = 'idle' | 'syncing';

export function useOfflineSaleQueue() {
    const isOnline = useOnlineStatus();
    const queryClient = useQueryClient();
    const [queue, setQueue] = useState<QueuedSale[]>([]);
    const [status, setStatus] = useState<SyncStatus>('idle');
    const syncingRef = useRef(false);

    const refresh = useCallback(() => setQueue(getQueuedSales()), []);

    useEffect(() => {
        refresh();
        window.addEventListener('store-console:offline-queue-changed', refresh);
        return () => window.removeEventListener('store-console:offline-queue-changed', refresh);
    }, [refresh]);

    const sync = useCallback(async () => {
        // Guards against duplicate sales: only one flush runs at a time, each
        // queued sale is only removed after Firebase confirms the write, and a
        // failed item stops the run rather than being retried in a tight loop.
        if (syncingRef.current) return;
        const pending = getQueuedSales();
        if (pending.length === 0) return;

        syncingRef.current = true;
        setStatus('syncing');
        let syncedCount = 0;

        for (const item of pending) {
            try {
                await salesApi.createSale(item.sale);
                dequeueSale(item.localId);
                syncedCount++;
            } catch {
                break; // still offline or a transient error — try again on the next trigger
            }
        }

        if (syncedCount > 0) {
            queryClient.invalidateQueries({queryKey: ['sales']});
            toast.success(`Synced ${syncedCount} offline sale${syncedCount === 1 ? '' : 's'}`);
        }

        refresh();
        setStatus('idle');
        syncingRef.current = false;
    }, [queryClient, refresh]);

    // Auto-sync whenever connectivity returns.
    useEffect(() => {
        if (isOnline) sync();
    }, [isOnline, sync]);

    return {queue, pendingCount: queue.length, status, isOnline, sync};
}