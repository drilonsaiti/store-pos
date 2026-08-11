'use client';

import {useEffect, useMemo, useRef, useState} from 'react';

/**
 * Client-side "load more" over an already-fetched array. Realtime Database
 * reads the whole products/sales node in one call (see lib/firebase/*), so
 * true server-side pagination would fight with the full-text/barcode search
 * that already runs over the complete set — this instead windows the
 * (already filtered) array and grows the window via an IntersectionObserver
 * sentinel, with a manual "Load more" button as a fallback / for a11y.
 */
export function useInfiniteList<T>(items: T[], pageSize = 20) {
    const [visibleCount, setVisibleCount] = useState(pageSize);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // Reset the window whenever the underlying list identity changes (a new
    // search/filter produced a different array) — not on every render.
    useEffect(() => {
        setVisibleCount(pageSize);
    }, [items, pageSize]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setVisibleCount((c) => Math.min(c + pageSize, items.length));
                }
            },
            {rootMargin: '200px'}
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [items.length, pageSize]);

    const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
    const hasMore = visibleCount < items.length;
    const loadMore = () => setVisibleCount((c) => Math.min(c + pageSize, items.length));

    return {visible, hasMore, loadMore, sentinelRef};
}