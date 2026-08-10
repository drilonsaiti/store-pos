// jsdom doesn't ship a real localStorage by default under vitest's 'node'
// environment; the offline-queue tests need one, so a tiny in-memory shim
// is enough without pulling in a full DOM environment for the whole suite.
class MemoryStorage {
    private store = new Map<string, string>();

    getItem(key: string) {
        return this.store.has(key) ? this.store.get(key)! : null;
    }

    setItem(key: string, value: string) {
        this.store.set(key, value);
    }

    removeItem(key: string) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }
}

// @ts-expect-error - minimal shim, not a full Window
globalThis.window = globalThis.window ?? {};
// @ts-expect-error - minimal shim
globalThis.window.localStorage = new MemoryStorage();
// @ts-expect-error - minimal shim
globalThis.window.dispatchEvent = globalThis.window.dispatchEvent ?? (() => true);

// Silences React's "not configured for act()" warning in the handful of
// tests that use @testing-library/react's renderHook under a real jsdom
// environment (declared per-file via `// @vitest-environment jsdom`).
// @ts-expect-error - React reads this global directly, no typed API for it
globalThis.IS_REACT_ACT_ENVIRONMENT = true;