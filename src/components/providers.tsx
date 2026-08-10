'use client';

import * as React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createSyncStoragePersister} from '@tanstack/query-sync-storage-persister';
import {ThemeProvider} from 'next-themes';
import {Toaster} from 'sonner';
import {AuthProvider} from '@/components/auth/auth-provider';

export function Providers({children}: { children: React.ReactNode }) {
    const [queryClient] = React.useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {retry: 1, refetchOnWindowFocus: false, gcTime: 1000 * 60 * 60 * 24},
                },
            })
    );

    // Caches products/sales query results to localStorage so the POS still has
    // last-known inventory to look up against immediately after a reload with
    // no connection, per the offline requirement. Only available client-side —
    // the server render always falls back to a plain QueryClientProvider.
    const [persister] = React.useState(() =>
        typeof window !== 'undefined'
            ? createSyncStoragePersister({storage: window.localStorage, key: 'store-console:query-cache'})
            : null
    );

    const content = (
        <AuthProvider>
            {children}
            <Toaster position="top-center" richColors closeButton/>
        </AuthProvider>
    );

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {persister ? (
                <PersistQueryClientProvider
                    client={queryClient}
                    persistOptions={{persister, maxAge: 1000 * 60 * 60 * 24}}
                >
                    {content}
                </PersistQueryClientProvider>
            ) : (
                <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
            )}
        </ThemeProvider>
    );
}