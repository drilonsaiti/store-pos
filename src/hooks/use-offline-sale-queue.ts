'use client';

import {useCallback, useEffect, useRef, useSyncExternalStore, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {dequeueSale, getQueuedSales, type QueuedSale} from '@/lib/offline/sale-queue';
import * as salesApi from '@/lib/firebase/sales';
import {useOnlineStatus} from './use-online-status';
import {toast} from 'sonner';

export type SyncStatus = 'idle' | 'syncing';

/** Cross-tab mutex name for the offline-queue flush. Two tabs on the same
 * device both reacting to the browser's 'online' event at once is a normal
 * occurrence, not an edge case — without this, both would read the same
 * pending queue before either had dequeued anything and could both submit
 * the same queued sale. */
const SYNC_LOCK_NAME = 'store-console:offline-sale-sync';

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
        // Per-tab guard: prevents this hook instance from starting a second
        // flush while one is already running (e.g. rapid repeated 'online'
        // events firing in quick succession within the same tab).
        if (syncingRef.current) return;

        if (getQueuedSales().length === 0) return;

        syncingRef.current = true;
        setStatus('syncing');

        const runSync = async () => {
            // Re-read here, not from the check above: time may have passed
            // while waiting for the cross-tab lock, and another tab could
            // have already drained some (or all) of the queue in the
            // meantime.
            const pending = getQueuedSales();
            let syncedCount = 0;

            for (const item of pending) {
                try {
                    await salesApi.createSale(item.sale, item.stockDeltas ?? []);
                    dequeueSale(item.localId);
                    syncedCount++;
                } catch {
                    break;
                }
            }

            if (syncedCount > 0) {
                queryClient.invalidateQueries({queryKey: ['sales']});
                queryClient.invalidateQueries({queryKey: ['products']});
                toast.success(
                    `Synced ${syncedCount} offline sale${syncedCount === 1 ? '' : 's'}`,
                );
            }
        };

        try {
            if (typeof navigator !== 'undefined' && 'locks' in navigator) {
                // Cross-tab guard. {ifAvailable: true} makes this resolve
                // immediately with lock === null if another tab already
                // holds it, instead of queuing behind it — we just skip this
                // run rather than duplicate-submit whatever the other tab is
                // already mid-way through sending. The other tab's own sync
                // will dequeue the shared (localStorage) queue, and this
                // tab's UI updates automatically via the native 'storage'
                // event already wired up in subscribe() below.
                await navigator.locks.request(SYNC_LOCK_NAME, {ifAvailable: true}, async (lock) => {
                    if (!lock) return;
                    await runSync();
                });
            } else {
                // No Web Locks support (rare, older browsers) — run
                // unguarded across tabs. The per-tab syncingRef guard above
                // still applies; only the cross-tab case is unprotected here.
                await runSync();
            }
        } finally {
            cachedQueue = null;
            setStatus('idle');
            syncingRef.current = false;
        }
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