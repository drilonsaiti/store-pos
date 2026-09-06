'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import {PauseCircle, PlayCircle, ScanLine} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Skeleton} from '@/components/ui/skeleton';
import {Badge} from '@/components/ui/badge';
import {Cart} from './cart';
import {CheckoutDialog} from './checkout-dialog';
import {BarcodeNotFound} from './barcode-not-found';
import {QuickAddProductDialog} from './quick-add-product-dialog';
import {AddSpecialItemDialog} from './add-special-item-dialog';
import {HoldSaleDialog} from './hold-sale-dialog';
import {HeldSalesListDialog} from './held-sales-list-dialog';
import type {ScanFeedback} from '@/components/scanner/barcode-scanner';
import {useBarcodeIndex, useProducts} from '@/hooks/use-products';
import {useCreateSale} from '@/hooks/use-sales';
import {useOnlineStatus} from '@/hooks/use-online-status';
import {useFormatCurrency} from '@/hooks/use-currency';
import {useCurrentEmployee} from '@/hooks/use-current-employee';
import {useHeldSales} from '@/hooks/use-held-sales';
import {enqueueSale} from '@/lib/offline/sale-queue';
import {useCartStore} from '@/stores/cart-store';
import {useHardwareBarcodeScanner} from '@/hooks/use-hardware-barcode-scanner';
import {findProductByBarcode, findProductByNameOrBarcode, normalizeBarcode} from '@/lib/utils/barcode';
import {matchesSearchQuery} from '@/lib/utils/search';
import {playScanError, playScanSuccess} from '@/lib/utils/feedback';
import {formatDateTime} from '@/lib/utils/dates';
import type {Product} from '@/types/product';
import type {HeldSale} from '@/types/held-sale';
import {toast} from 'sonner';
import type { PaymentInfo } from './checkout-dialog';
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
    const {items, addProduct, addLine, loadItems, clear, total, totalQuantity} = useCartStore();
    const createSale = useCreateSale();
    const isOnline = useOnlineStatus();
    const fmt = useFormatCurrency();
    const {employee: currentEmployee} = useCurrentEmployee();
    const {heldSales, hold, remove: removeHeld} = useHeldSales();

    const [inputValue, setInputValue] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerMounted, setScannerMounted] = useState(false);
    const openScanner = useCallback(() => {
        setScannerMounted(true);
        setScannerOpen(true);
    }, []);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [specialProduct, setSpecialProduct] = useState<Product | null>(null);
    const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
    const [lastScannedId, setLastScannedId] = useState<string | null>(null);
    const [holdDialogOpen, setHoldDialogOpen] = useState(false);
    const [heldListOpen, setHeldListOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const suggestions = useMemo(() => {
        const q = inputValue.trim();
        if (!q) return [];
        return products
            .filter((p) => matchesSearchQuery(p.name, q) || normalizeBarcode(p.barCode).includes(normalizeBarcode(q)))
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

    /** Central "a product was picked" entry point. Plain pieces add instantly;
     * weight- or package-configured products open a picker first. */
    const handleProductSelected = useCallback(
        (product: Product) => {
            if (product.saleUnit === 'weight' || product.packageOption) {
                setSpecialProduct(product);
                setInputValue('');
                setNotFoundCode(null);
                return;
            }
            addToCart(product);
        },
        [addToCart]
    );

    const handleBarcode = useCallback(
        (barcode: string) => {
            const product = findProductByBarcode(barcodeIndex, barcode);
            if (product) {
                handleProductSelected(product);
            } else {
                playScanError();
                setNotFoundCode(normalizeBarcode(barcode));
            }
        },
        [barcodeIndex, handleProductSelected]
    );

    const handleManualSubmit = useCallback(() => {
        const value = inputValue.trim();
        if (!value) return;
        const product = findProductByBarcode(barcodeIndex, value) ?? findProductByNameOrBarcode(products, value);
        if (product) {
            handleProductSelected(product);
        } else {
            playScanError();
            setNotFoundCode(value);
        }
    }, [inputValue, barcodeIndex, products, handleProductSelected]);

    const showScanFeedback = useCallback((fb: ScanFeedback) => {
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        setScanFeedback(fb);
        feedbackTimeoutRef.current = setTimeout(() => setScanFeedback(null), 1600);
    }, []);

    const handleCameraDetect = useCallback(
        (barcode: string) => {
            const product = findProductByBarcode(barcodeIndex, barcode);
            if (product) {
                if (product.saleUnit === 'weight' || product.packageOption) {
                    setScannerOpen(false);
                    setSpecialProduct(product);
                    return;
                }
                addProduct(product);
                playScanSuccess();
                setLastScannedId(product.id);
                showScanFeedback({type: 'success', message: `${product.name} added`});
            } else {
                playScanError();
                const code = normalizeBarcode(barcode);
                setNotFoundCode(code);
                showScanFeedback({type: 'error', message: `Not found: ${code}`});
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

    const anyModalOpen = scannerOpen || checkoutOpen || quickAddOpen || Boolean(specialProduct) || holdDialogOpen || heldListOpen;
    useHardwareBarcodeScanner({onScan: handleBarcode, enabled: !anyModalOpen});

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

    const handleConfirmSale = async (payment: { amountReceived?: number; changeDue?: number }) => {
        const sale = {
            date: new Date().toISOString(),
            totalPrice: total(),
            totalQuantity: totalQuantity(),
            ...(currentEmployee?.id ? {employeeId: currentEmployee.id} : {}),
            ...(currentEmployee?.name ? {employeeName: currentEmployee.name} : {}),
            ...(payment.amountReceived !== undefined
                ? { amountReceived: payment.amountReceived }
                : {}),
            ...(payment.changeDue !== undefined
                ? { changeDue: payment.changeDue }
                : {}),
            products: items.map((item) => ({
                idProduct: item.productId,
                name: item.name,
                barCode: item.barcode,
                price: item.price,
                purchasePrice: item.purchasePrice,
                quantity: item.quantity,
                date: new Date().toISOString(),
                mode: item.mode,
                ...(item.unitLabel ? {unitLabel: item.unitLabel} : {}),
            })),
        };

        setIsCheckingOut(true);
        try {
            if (!isOnline) {
                enqueueSale(sale);
                toast.info('Saved offline — will sync automatically once back online');
            } else {
                const created = await createSale.mutateAsync(sale);
                toast.success('Sale completed', {
                    action: {
                        label: 'Print receipt',
                        onClick: () => window.open(`/print/receipt/${created.id}`, '_blank'),
                    },
                });
            }
        } catch (error) {
            // Genuine failure while online — don't silently mask it as "saved offline".
            console.error('Sale failed', error);
            enqueueSale(sale);
            toast.error('Could not save sale online — queued to retry automatically', {
                description: error instanceof Error ? error.message : undefined,
            });
        } finally {
            setIsCheckingOut(false);
        }

        clear();
        setLastScannedId(null);
        setCheckoutOpen(false);
        searchRef.current?.focus();
    };

    const handleHoldSale = (label: string) => {
        hold(items, label);
        clear();
        setLastScannedId(null);
        toast.success('Sale held', {description: label});
        searchRef.current?.focus();
    };

    const handleResumeHeld = (saved: HeldSale) => {
        if (items.length > 0) {
            // Park the current cart too rather than silently discarding it —
            // a cashier resuming one held sale shouldn't lose whatever's already
            // in progress.
            hold(items, `Auto-held ${formatDateTime(new Date().toISOString())}`);
        }
        loadItems(saved.items);
        removeHeld(saved.id);
        setHeldListOpen(false);
        toast.success('Sale resumed', {description: saved.label});
        searchRef.current?.focus();
    };

    return (
        <div className="grid gap-4 p-4 pb-28 lg:grid-cols-[1fr_380px] lg:p-6 lg:pb-6">
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
                                            onClick={() => handleProductSelected(p)}
                                            className="flex w-full min-h-11 items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                                        >
                      <span>
                        {p.name} <span className="tabular text-muted-foreground">· {p.barCode}</span>
                      </span>
                                            <span className="tabular text-muted-foreground">{fmt(p.price)}</span>
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

                    <div className="mt-2 flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            disabled={items.length === 0}
                            onClick={() => setHoldDialogOpen(true)}
                        >
                            <PauseCircle className="h-4 w-4"/>
                            Hold sale
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setHeldListOpen(true)}>
                            <PlayCircle className="h-4 w-4"/>
                            Held sales
                            {heldSales.length > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {heldSales.length}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </Card>

                {notFoundCode && (
                    <BarcodeNotFound
                        barcode={notFoundCode}
                        onCreateProduct={() => setQuickAddOpen(true)}
                        onSearchManually={() => {
                            setNotFoundCode(null);
                            searchRef.current?.focus();
                        }}
                        onScanAgain={() => {
                            setNotFoundCode(null);
                            openScanner();
                        }}
                        onClose={() => setNotFoundCode(null)}
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
                className="safe-bottom fixed inset-x-0 bottom-16 z-30 border-t bg-card p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:static lg:bottom-auto lg:h-fit lg:rounded-lg lg:border lg:shadow-sm">
                <div className="mb-3 flex items-center justify-between" aria-live="polite" aria-atomic="true">
                    <span className="text-muted-foreground">Total</span>
                    <span className="tabular text-2xl font-semibold">{fmt(total())}</span>
                </div>
                <Button size="lg" className="h-12 w-full" disabled={items.length === 0}
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
                    lastProductId={lastScannedId}
                />
            )}

            <CheckoutDialog
                open={checkoutOpen}
                onOpenChange={setCheckoutOpen}
                onConfirm={handleConfirmSale}
                isSubmitting={isCheckingOut}
            />

            <QuickAddProductDialog
                open={quickAddOpen}
                onOpenChange={(open) => {
                    setQuickAddOpen(open);
                    if (!open) setNotFoundCode(null);
                }}
                barcode={notFoundCode ?? ''}
                onCreated={(product) => {
                    addToCart(product);
                    setQuickAddOpen(false);
                    setNotFoundCode(null);
                }}
            />

            <AddSpecialItemDialog
                product={specialProduct}
                onOpenChange={(open) => !open && setSpecialProduct(null)}
                onConfirm={({mode, quantity, unitPrice, unitLabel}) => {
                    if (!specialProduct) return;
                    addLine({
                        product: specialProduct,
                        mode,
                        quantity,
                        unitPrice,
                        ...(unitLabel ? {unitLabel} : {}),
                    });
                    playScanSuccess();
                }}
            />

            <HoldSaleDialog
                open={holdDialogOpen}
                onOpenChange={setHoldDialogOpen}
                onConfirm={handleHoldSale}
                suggestedLabel={`Sale ${formatDateTime(new Date().toISOString())}`}
            />

            <HeldSalesListDialog
                open={heldListOpen}
                onOpenChange={setHeldListOpen}
                heldSales={heldSales}
                onResume={handleResumeHeld}
                onDelete={removeHeld}
            />
        </div>
    );
}