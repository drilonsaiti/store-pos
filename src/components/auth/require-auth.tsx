'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';
import { ScanBarcode } from 'lucide-react';

/**
 * Gate for every authenticated screen. Renders nothing (a lightweight splash)
 * until the Firebase auth state resolves, then redirects to /login if there's
 * no signed-in user — otherwise renders the protected content.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [loading, user, router]);

    if (loading || !user) {
        return (
            <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <ScanBarcode className="h-5 w-5" />
                </div>
                <p className="text-sm">Loading…</p>
            </div>
        );
    }

    return <>{children}</>;
}