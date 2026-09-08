// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act} from 'react';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {ReactNode} from 'react';


vi.mock('sonner', () => ({
    toast: {success: vi.fn(), error: vi.fn(), info: vi.fn()},
}));

vi.mock('@/lib/firebase/sales', () => ({
    createSale: vi.fn(),
}));

import * as salesApi from '../../lib/firebase/sales';
import {toast} from 'sonner';
import {useOfflineSaleQueue} from '../use-offline-sale-queue';
import {SaleInput} from "../../types/sale";
import {enqueueSale} from "../../lib/offline/sale-queue";

function makeSaleInput(overrides: Partial<SaleInput> = {}): SaleInput {
    return {
        date: new Date().toISOString(),
        products: [],
        totalPrice: 10,
        totalQuantity: 1,
        ...overrides,
    };
}

function renderQueueHook() {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({children}: {children: ReactNode}) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const result = renderHook(() => useOfflineSaleQueue(), {wrapper});
    return {...result, invalidateSpy};
}

/** Grants the Web Locks request immediately, simulating this tab winning
 * (or being the only one holding) the cross-tab sync lock. */
function mockLocksGranted() {
    Object.defineProperty(globalThis.navigator, 'locks', {
        configurable: true,
        value: {
            request: vi.fn(async (_name: string, _opts: unknown, callback: (lock: unknown) => unknown) =>
                callback({name: _name})
            ),
        },
    });
}

/** Simulates another tab already holding the lock — `{ifAvailable: true}`
 * resolves immediately with a null lock, exactly like the real API. */
function mockLocksDeniedByAnotherTab() {
    Object.defineProperty(globalThis.navigator, 'locks', {
        configurable: true,
        value: {
            request: vi.fn(async (_name: string, _opts: unknown, callback: (lock: null) => unknown) =>
                callback(null)
            ),
        },
    });
}

/** Simulates an older browser with no Web Locks API at all. */
function mockLocksUnsupported() {
    Reflect.deleteProperty(globalThis.navigator, 'locks');
}

beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(salesApi.createSale).mockReset();
    vi.mocked(toast.success).mockClear();
    mockLocksGranted(); // sensible default for tests that aren't about locking itself
});

afterEach(() => {
    Reflect.deleteProperty(globalThis.navigator, 'locks');
});

describe('useOfflineSaleQueue — core sync behavior', () => {
    it('does nothing when the queue is empty', async () => {
        const {result} = renderQueueHook();

        await act(async () => {
            await result.current.sync();
        });

        expect(salesApi.createSale).not.toHaveBeenCalled();
    });

    it('syncs a queued sale and removes it from the queue on success', async () => {
        vi.mocked(salesApi.createSale).mockResolvedValue({id: 's1', ...makeSaleInput()});
        const sale = makeSaleInput({totalPrice: 42});
        const stockDeltas = [{productId: 'p1', delta: -2}];
        act(() => {
            enqueueSale(sale, stockDeltas);
        });

        const {result} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(1));

        await act(async () => {
            await result.current.sync();
        });

        expect(salesApi.createSale).toHaveBeenCalledWith(sale, stockDeltas);
        expect(result.current.pendingCount).toBe(0);
    });

    it('syncs multiple queued sales in order and removes each on success', async () => {
        vi.mocked(salesApi.createSale).mockResolvedValue({id: 'x', ...makeSaleInput()});
        act(() => {
            enqueueSale(makeSaleInput({totalPrice: 1}), []);
            enqueueSale(makeSaleInput({totalPrice: 2}), []);
        });

        const {result} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(2));

        await act(async () => {
            await result.current.sync();
        });

        expect(salesApi.createSale).toHaveBeenCalledTimes(2);
        expect(result.current.pendingCount).toBe(0);
    });

    it('stops at the first failure and leaves the rest of the queue untouched', async () => {
        vi.mocked(salesApi.createSale)
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValue({id: 'x', ...makeSaleInput()});
        act(() => {
            enqueueSale(makeSaleInput({totalPrice: 1}), []);
            enqueueSale(makeSaleInput({totalPrice: 2}), []);
        });

        const {result} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(2));

        await act(async () => {
            await result.current.sync();
        });

        // Only the first (failing) item was attempted — the loop breaks
        // rather than skipping ahead to the second item.
        expect(salesApi.createSale).toHaveBeenCalledTimes(1);
        expect(result.current.pendingCount).toBe(2);
    });

    it('shows a singular toast message for exactly one synced sale', async () => {
        vi.mocked(salesApi.createSale).mockResolvedValue({id: 'x', ...makeSaleInput()});
        act(() => {
            enqueueSale(makeSaleInput(), []);
        });
        const {result} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(1));

        await act(async () => {
            await result.current.sync();
        });

        expect(toast.success).toHaveBeenCalledWith('Synced 1 offline sale');
    });

    it('shows a plural toast message for more than one synced sale', async () => {
        vi.mocked(salesApi.createSale).mockResolvedValue({id: 'x', ...makeSaleInput()});
        act(() => {
            enqueueSale(makeSaleInput(), []);
            enqueueSale(makeSaleInput(), []);
        });
        const {result} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(2));

        await act(async () => {
            await result.current.sync();
        });

        expect(toast.success).toHaveBeenCalledWith('Synced 2 offline sales');
    });

    it('does not toast or invalidate queries when nothing synced', async () => {
        vi.mocked(salesApi.createSale).mockRejectedValue(new Error('offline'));
        act(() => {
            enqueueSale(makeSaleInput(), []);
        });
        const {result, invalidateSpy} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(1));

        await act(async () => {
            await result.current.sync();
        });

        expect(toast.success).not.toHaveBeenCalled();
        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it('invalidates both sales and products queries after a successful sync', async () => {
        vi.mocked(salesApi.createSale).mockResolvedValue({id: 'x', ...makeSaleInput()});
        act(() => {
            enqueueSale(makeSaleInput(), []);
        });
        const {result, invalidateSpy} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(1));

        await act(async () => {
            await result.current.sync();
        });

        const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey?.[0]);
        expect(invalidatedKeys).toEqual(expect.arrayContaining(['sales', 'products']));
    });

    it('returns to idle status after a sync completes', async () => {
        vi.mocked(salesApi.createSale).mockResolvedValue({id: 'x', ...makeSaleInput()});
        act(() => {
            enqueueSale(makeSaleInput(), []);
        });
        const {result} = renderQueueHook();

        await act(async () => {
            await result.current.sync();
        });

        expect(result.current.status).toBe('idle');
    });
});

describe('useOfflineSaleQueue — reactivity to the underlying queue', () => {
    it('reflects a sale enqueued after the hook has already rendered', async () => {
        const {result} = renderQueueHook();
        expect(result.current.pendingCount).toBe(0);

        act(() => {
            enqueueSale(makeSaleInput(), []);
        });

        await waitFor(() => expect(result.current.pendingCount).toBe(1));
    });
});

describe('useOfflineSaleQueue — auto-sync on reconnect', () => {
    it('triggers a sync automatically when the browser fires the online event', async () => {
        vi.mocked(salesApi.createSale).mockResolvedValue({id: 'x', ...makeSaleInput()});
        act(() => {
            enqueueSale(makeSaleInput(), []);
        });
        renderQueueHook();

        await act(async () => {
            window.dispatchEvent(new Event('online'));
            // Let the async sync() triggered by the event listener resolve.
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        await waitFor(() => expect(salesApi.createSale).toHaveBeenCalled());
    });
});

describe('useOfflineSaleQueue — cross-tab lock (Fix #10)', () => {
    it('proceeds with the sync when the Web Locks API grants the lock', async () => {
        mockLocksGranted();
        vi.mocked(salesApi.createSale).mockResolvedValue({id: 'x', ...makeSaleInput()});
        act(() => {
            enqueueSale(makeSaleInput(), []);
        });
        const {result} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(1));

        await act(async () => {
            await result.current.sync();
        });

        expect(salesApi.createSale).toHaveBeenCalledTimes(1);
        expect(result.current.pendingCount).toBe(0);
    });

    it('skips the sync entirely when another tab already holds the lock', async () => {
        mockLocksDeniedByAnotherTab();
        vi.mocked(salesApi.createSale).mockResolvedValue({id: 'x', ...makeSaleInput()});
        act(() => {
            enqueueSale(makeSaleInput(), []);
        });
        const {result} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(1));

        await act(async () => {
            await result.current.sync();
        });

        // Nothing should have been attempted, and the queue is untouched —
        // this is the actual behavior that prevents two tabs from both
        // submitting the same queued sale.
        expect(salesApi.createSale).not.toHaveBeenCalled();
        expect(result.current.pendingCount).toBe(1);
    });

    it('falls back to running the sync unguarded when Web Locks is unsupported', async () => {
        mockLocksUnsupported();
        vi.mocked(salesApi.createSale).mockResolvedValue({id: 'x', ...makeSaleInput()});
        act(() => {
            enqueueSale(makeSaleInput(), []);
        });
        const {result} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(1));

        await act(async () => {
            await result.current.sync();
        });

        expect(salesApi.createSale).toHaveBeenCalledTimes(1);
        expect(result.current.pendingCount).toBe(0);
    });
});

describe('useOfflineSaleQueue — per-tab re-entrancy guard', () => {
    it('does not start a second flush while one is already in flight in the same tab', async () => {
        let resolveFirstCall!: () => void;
        const firstCallGate = new Promise<void>((resolve) => {
            resolveFirstCall = resolve;
        });

        vi.mocked(salesApi.createSale).mockImplementation(async () => {
            await firstCallGate;
            return {id: 'x', ...makeSaleInput()};
        });

        act(() => {
            enqueueSale(makeSaleInput(), []);
        });
        const {result} = renderQueueHook();
        await waitFor(() => expect(result.current.pendingCount).toBe(1));

        let firstSync!: Promise<void>;
        let secondSync!: Promise<void>;
        act(() => {
            firstSync = result.current.sync();
            secondSync = result.current.sync(); // fired before the first has resolved
        });

        resolveFirstCall();
        await act(async () => {
            await Promise.all([firstSync, secondSync]);
        });

        // Only one flush should have actually run createSale, even though
        // sync() was called twice back-to-back.
        expect(salesApi.createSale).toHaveBeenCalledTimes(1);
    });
});