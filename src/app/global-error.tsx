'use client';

import {useEffect} from 'react';

/**
 * Catches errors thrown by the root layout itself (rare — e.g. a provider
 * failing to initialize). Must render its own <html>/<body> since the
 * layout that would normally provide them is what failed.
 */
export default function GlobalError({error, reset}: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
        <body>
        <div style={{
            display: 'flex',
            minHeight: '100dvh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <p style={{fontWeight: 600}}>Store Console failed to load</p>
            <p style={{color: '#6b7280', fontSize: 14, maxWidth: 320}}>
                Something went wrong loading the app. Reloading usually fixes this.
            </p>
            <button
                onClick={() => reset()}
                style={{
                    height: 44,
                    padding: '0 16px',
                    borderRadius: 8,
                    background: '#4F46E5',
                    color: 'white',
                    fontWeight: 500,
                    border: 'none'
                }}
            >
                Reload
            </button>
        </div>
        </body>
        </html>
    );
}