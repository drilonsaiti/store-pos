'use client';

import {useCallback, useEffect, useRef, useSyncExternalStore, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {dequeueSale, getQueuedSales, type QueuedSale} from '@/lib/offline/sale-queue';
import * as salesApi from '@/lib/firebase/sales';
import {useOnlineStatus} from './use-online-status';
import {toast} from 'sonner';

export type SyncStatus = 'idle' | 'syncing';

let cachedQueue: QueuedSale[] | null = null;

function readQueue(): QueuedSale[] {
    if (cachedQueue === null) {
        cachedQueue = getQueuedSales();
    }

    return cachedQueue;
}

function subscribe(callback: () => void) {
    const handleChange = () => {
        cachedQueue = null;
        callback();
    };

    window.addEventListener(
        'store-console:offline-queue-changed',
        handleChange,
    );
    window.addEventListener('storage', handleChange);

    return () => {
        window.removeEventListener(
            'store-console:offline-queue-changed',
            handleChange,
        );
        window.removeEventListener('storage', handleChange);
    };
}

export function useOfflineSaleQueue() {
    const isOnline = useOnlineStatus();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<SyncStatus>('idle');
    const syncingRef = useRef(false);

    const queue = useSyncExternalStore(
        subscribe,
        readQueue,
        () => [],
    );

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
                break;
            }
        }

        if (syncedCount > 0) {
            queryClient.invalidateQueries({queryKey: ['sales']});
            toast.success(
                `Synced ${syncedCount} offline sale${syncedCount === 1 ? '' : 's'}`,
            );
        }

        cachedQueue = null;
        setStatus('idle');
        syncingRef.current = false;
    }, [queryClient]);

    // Auto-sync whenever connectivity returns.
    useEffect(() => {
        const handleOnline = () => {
            void sync();
        };

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [sync]);

    return {
        queue,
        pendingCount: queue.length,
        status,
        isOnline,
        sync,
    };
}