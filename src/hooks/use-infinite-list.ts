'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

interface ListState<T> {
    source: T[];
    pageSize: number;
    visibleCount: number;
}

/**
 * Client-side "load more" over an already-fetched array. Realtime Database
 * reads the whole products/sales node in one call (see lib/firebase/*), so
 * true server-side pagination would fight with the full-text/barcode search
 * that already runs over the complete set — this instead windows the
 * (already filtered) array and grows the window via an IntersectionObserver
 * sentinel, with a manual "Load more" button as a fallback / for a11y.
 */
export function useInfiniteList<T>(items: T[], pageSize = 20) {
    const [state, setState] = useState<ListState<T>>({
        source: items,
        pageSize,
        visibleCount: pageSize,
    });

    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const sourceChanged =
        state.source !== items ||
        state.pageSize !== pageSize;

    const visibleCount = sourceChanged
        ? pageSize
        : state.visibleCount;

    const loadMore = useCallback(() => {
        setState({
            source: items,
            pageSize,
            visibleCount: Math.min(
                visibleCount + pageSize,
                items.length,
            ),
        });
    }, [items, pageSize, visibleCount]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting) return;

                setState((current) => {
                    const sourceChanged =
                        current.source !== items ||
                        current.pageSize !== pageSize;

                    const currentVisibleCount = sourceChanged
                        ? pageSize
                        : current.visibleCount;

                    return {
                        source: items,
                        pageSize,
                        visibleCount: Math.min(
                            currentVisibleCount + pageSize,
                            items.length,
                        ),
                    };
                });
            },
            {rootMargin: '200px'},
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [items, pageSize]);

    const visible = items.slice(0, visibleCount);
    const hasMore = visibleCount < items.length;

    return {
        visible,
        hasMore,
        loadMore,
        sentinelRef,
    };
}
