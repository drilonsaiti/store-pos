'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import {ScanLine} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Skeleton} from '@/components/ui/skeleton';
import {Cart} from './cart';
import {CheckoutDialog} from './checkout-dialog';
import {BarcodeNotFound} from './barcode-not-found';
import type {ScanFeedback} from '@/components/scanner/barcode-scanner';
import {useBarcodeIndex, useProducts} from '@/hooks/use-products';
import {useCreateSale} from '@/hooks/use-sales';
import {useOnlineStatus} from '@/hooks/use-online-status';
import {enqueueSale} from '@/lib/offline/sale-queue';
import {useCartStore} from '@/stores/cart-store';
import {useHardwareBarcodeScanner} from '@/hooks/use-hardware-barcode-scanner';
import {findProductByBarcode, findProductByNameOrBarcode, normalizeBarcode} from '@/lib/utils/barcode';
import {playScanError, playScanSuccess} from '@/lib/utils/feedback';
import {formatCurrency} from '@/lib/utils/currency';
import type {Product} from '@/types/product';
import {toast} from 'sonner';

// Camera scanner is code-split and only fetched once the user actually taps
// "Scan barcode" — most transactions may never need it (manual search /
// hardware scanner also add to cart), so it shouldn't cost every POS load.
const BarcodeScanner = dynamic(
    () => import('@/components/scanner/barcode-scanner').then((m) => m.BarcodeScanner),
    {
        ssr: false,
        loading: () => (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <Skeleton className="h-14 w-14 rounded-full"/>
            </div>
        ),
    }
);

export function PosScreen() {
    const {data: products = []} = useProducts();
    const barcodeIndex = useBarcodeIndex();
    const {items, addProduct, clear, total, totalQuantity} = useCartStore();
    const createSale = useCreateSale();
    const isOnline = useOnlineStatus();

    const [inputValue, setInputValue] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerMounted, setScannerMounted] = useState(false);
    const openScanner = useCallback(() => {
        setScannerMounted(true);
        setScannerOpen(true);
    }, []);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
    const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const suggestions = useMemo(() => {
        const q = inputValue.trim().toLowerCase();
        if (!q) return [];
        return products
            .filter((p) => p.name.toLowerCase().includes(q) || normalizeBarcode(p.barCode).includes(q))
            .slice(0, 6);
    }, [inputValue, products]);

    const addToCart = useCallback(
        (product: Product) => {
            addProduct(product);
            playScanSuccess();
            setNotFoundCode(null);
            setInputValue('');
        },
        [addProduct]
    );

    const handleBarcode = useCallback(
        (barcode: string) => {
            const product = findProductByBarcode(barcodeIndex, barcode);
            if (product) {
                addToCart(product);
            } else {
                playScanError();
                setNotFoundCode(normalizeBarcode(barcode));
            }
        },
        [barcodeIndex, addToCart]
    );

    const handleManualSubmit = useCallback(() => {
        const value = inputValue.trim();
        if (!value) return;
        const product = findProductByBarcode(barcodeIndex, value) ?? findProductByNameOrBarcode(products, value);
        if (product) {
            addToCart(product);
        } else {
            playScanError();
            setNotFoundCode(value);
        }
    }, [inputValue, barcodeIndex, products, addToCart]);

    const showScanFeedback = useCallback((fb: ScanFeedback) => {
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        setScanFeedback(fb);
        feedbackTimeoutRef.current = setTimeout(() => setScanFeedback(null), 1600);
    }, []);

    const handleCameraDetect = useCallback(
        (barcode: string) => {
            const product = findProductByBarcode(barcodeIndex, barcode);
            if (product) {
                addProduct(product);
                playScanSuccess();
                showScanFeedback({type: 'success', message: `${product.name} added`});
            } else {
                playScanError();
                showScanFeedback({type: 'error', message: `Not found: ${normalizeBarcode(barcode)}`});
            }
        },
        [barcodeIndex, addProduct, showScanFeedback]
    );

    useEffect(() => {
        if (scannerOpen) return;
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        setScanFeedback(null);
    }, [scannerOpen]);

    useEffect(() => () => {
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    }, []);

    useHardwareBarcodeScanner({onScan: handleBarcode, enabled: !scannerOpen && !checkoutOpen});

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
                return;
            }
            if (e.key === 'F4' && !scannerOpen) {
                e.preventDefault();
                openScanner();
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isTyping && items.length > 0) {
                e.preventDefault();
                setCheckoutOpen(true);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [scannerOpen, items.length, openScanner]);

    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const handleConfirmSale = async () => {
        const sale = {
            date: new Date().toISOString(),
            totalPrice: total(),
            totalQuantity: totalQuantity(),
            products: items.map((item) => ({
                idProduct: item.productId,
                name: item.name,
                barCode: item.barcode,
                price: item.price,
                purchasePrice: item.purchasePrice,
                quantity: item.quantity,
                date: new Date().toISOString(),
            })),
        };

        setIsCheckingOut(true);
        try {
            if (isOnline) {
                await createSale.mutateAsync(sale);
            } else {
                throw new Error('offline');
            }
        } catch {
            enqueueSale(sale);
            toast.info('Saved offline — will sync automatically once back online');
        } finally {
            setIsCheckingOut(false);
        }

        clear();
        setCheckoutOpen(false);
        searchRef.current?.focus();
    };

    return (
        <div className="grid gap-4 p-4 pb-28 md:grid-cols-[1fr_360px] md:p-6 md:pb-6">
            <div className="flex flex-col gap-4">
                <Card className="p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                            <Input
                                ref={searchRef}
                                autoFocus
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleManualSubmit();
                                }}
                                placeholder="Scan or search product / barcode"
                                className="h-12 text-base"
                                aria-label="Scan or search product"
                                role="combobox"
                                aria-expanded={suggestions.length > 0}
                                aria-controls="pos-search-suggestions"
                                autoComplete="off"
                            />
                            {suggestions.length > 0 && (
                                <div
                                    id="pos-search-suggestions"
                                    role="listbox"
                                    className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border bg-popover shadow-md"
                                >
                                    {suggestions.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            role="option"
                                            aria-selected={false}
                                            onClick={() => addToCart(p)}
                                            className="flex w-full min-h-11 items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                                        >
                      <span>
                        {p.name} <span className="tabular text-muted-foreground">· {p.barCode}</span>
                      </span>
                                            <span
                                                className="tabular text-muted-foreground">{formatCurrency(p.price)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button size="lg" className="h-12 shrink-0" onClick={openScanner}>
                            <ScanLine className="h-5 w-5"/>
                            Scan barcode
                        </Button>
                    </div>
                </Card>

                {notFoundCode && (
                    <BarcodeNotFound
                        barcode={notFoundCode}
                        onSearchManually={() => {
                            setNotFoundCode(null);
                            searchRef.current?.focus();
                        }}
                        onScanAgain={() => {
                            setNotFoundCode(null);
                            openScanner();
                        }}
                    />
                )}

                <Card className="flex-1">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <h2 className="font-medium">Cart</h2>
                        <span className="tabular text-sm text-muted-foreground" aria-live="polite">
              {totalQuantity()} items
            </span>
                    </div>
                    <div className="px-4">
                        <Cart/>
                    </div>
                </Card>
            </div>

            <div
                className="safe-bottom fixed inset-x-0 bottom-16 z-30 border-t bg-card p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:static md:bottom-auto md:h-fit md:rounded-lg md:border md:shadow-sm">
                <div className="mb-3 flex items-center justify-between" aria-live="polite" aria-atomic="true">
                    <span className="text-muted-foreground">Total</span>
                    <span className="tabular text-2xl font-semibold">{formatCurrency(total())}</span>
                </div>
                <Button size="lg" className="h-12 w-full " disabled={items.length === 0}
                        onClick={() => setCheckoutOpen(true)}>
                    Complete sale
                </Button>
            </div>

            {scannerMounted && (
                <BarcodeScanner
                    open={scannerOpen}
                    onOpenChange={setScannerOpen}
                    onDetect={handleCameraDetect}
                    feedback={scanFeedback}
                    cartCount={totalQuantity()}
                    cartTotal={total()}
                />
            )}

            <CheckoutDialog
                open={checkoutOpen}
                onOpenChange={setCheckoutOpen}
                onConfirm={handleConfirmSale}
                isSubmitting={isCheckingOut}
            />
        </div>
    );
}