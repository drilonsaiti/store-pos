import {Skeleton} from '@/components/ui/skeleton';

/**
 * Shown by Next's automatic route-level Suspense boundary (loading.tsx)
 * while a page's chunk streams in — the gap that plain client-side
 * isLoading state can't cover, since it can't render before the page's own
 * JS has arrived.
 */
export function RouteSkeleton({rows = 4}: { rows?: number }) {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <Skeleton className="h-8 w-40"/>
            <div className="flex flex-col gap-3">
                {Array.from({length: rows}).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full"/>
                ))}
            </div>
        </div>
    );
}