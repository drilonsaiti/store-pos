const APP_LOCAL_KEYS_PREFIX = 'store-console:';

/** Clears this app's own localStorage data — call on sign-out so a shared
 * device doesn't retain business data after a staff member logs out. */
export function clearLocalAppData() {
    Object.keys(window.localStorage)
        .filter((key) => key.startsWith(APP_LOCAL_KEYS_PREFIX))
        .forEach((key) => window.localStorage.removeItem(key));
}