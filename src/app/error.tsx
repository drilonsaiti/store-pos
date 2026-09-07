'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {AlertTriangle} from 'lucide-react';
import {Button} from '@/components/ui/button';

/**
 * Route-level error boundary — catches render/render-phase errors within
 * any page and shows a real recovery UI instead of a blank screen or a
 * console.error the user never sees. Data-fetch failures (Firebase reads/
 * writes) are handled separately by each page's isError state + toasts;
 * this is the backstop for anything that throws during render.
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>

            <div>
                <p className="font-medium">Something went wrong</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    The page hit an unexpected error. Your data is safe — try again.
                </p>
            </div>

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={() => router.push('/')}
                >
                    Go to dashboard
                </Button>

                <Button onClick={reset}>
                    Try again
                </Button>
            </div>
        </div>
    );
}
