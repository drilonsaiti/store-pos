const APP_LOCAL_KEYS_PREFIX = 'store-console:';

/** Clears this app's own localStorage data — call on sign-out so a shared
 * device doesn't retain business data after a staff member logs out. */
export function clearLocalAppData() {
    Object.keys(window.localStorage)
        .filter((key) => key.startsWith(APP_LOCAL_KEYS_PREFIX))
        .forEach((key) => window.localStorage.removeItem(key));
}

/** Also drops the service worker's app-shell cache (Cache Storage API) on
 * sign-out — localStorage alone isn't the only thing that persists on a
 * shared device; the cached shell HTML/JS otherwise survives a sign-out
 * indefinitely. Safe no-op if the Cache Storage API or this cache isn't
 * present (e.g. no service worker registered yet, or already cleared). */
export async function clearAppShellCache(): Promise<void> {
    if (typeof caches === 'undefined') return;
    try {
        const keys = await caches.keys();
        await Promise.all(
            keys.filter((key) => key.startsWith('store-console-shell')).map((key) => caches.delete(key))
        );
    } catch {
        // Cache Storage unsupported/unavailable — nothing to clean up.
    }
}