'use client';

import {useCallback, useMemo, useState} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {ScanLine, Undo2, PackageCheck} from 'lucide-react';
import {AppShell} from '@/components/layout/app-shell';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Skeleton} from '@/components/ui/skeleton';
import {EmptyState} from '@/components/ui/empty-state';
import {RestockQuantityDialog} from '@/components/products/restock-quantity-dialog';
import {
    useProducts,
    useBarcodeIndex,
    useIncrementProductQuantity,
} from '@/hooks/use-products';
import {useHardwareBarcodeScanner} from '@/hooks/use-hardware-barcode-scanner';
import {
    findProductByBarcode,
    findProductByNameOrBarcode,
    normalizeBarcode,
} from '@/lib/utils/barcode';
import {matchesSearchQuery} from '@/lib/utils/search';
import {playScanSuccess, playScanError} from '@/lib/utils/feedback';
import {formatDateTime} from '@/lib/utils/dates';
import type {Product} from '@/types/product';

const BarcodeScanner = dynamic(
    () =>
        import('@/components/scanner/barcode-scanner').then(
            (m) => m.BarcodeScanner,
        ),
    {
        ssr: false,
        loading: () => (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <Skeleton className="h-14 w-14 rounded-full" />
            </div>
        ),
    },
);

interface LogEntry {
    key: string;
    productId: string;
    name: string;
    added: number;
    unit: string;
    newTotal: number;
    at: string;
    undone: boolean;
}

export default function RestockPage() {
    const {data: products = []} = useProducts();
    const barcodeIndex = useBarcodeIndex();
    const incrementQuantity = useIncrementProductQuantity();

    const [inputValue, setInputValue] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerMounted, setScannerMounted] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
    const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
    const [log, setLog] = useState<LogEntry[]>([]);

    const openScanner = useCallback(() => {
        setScannerMounted(true);
        setScannerOpen(true);
    }, []);

    const suggestions = useMemo(() => {
        const q = inputValue.trim();

        if (!q) return [];

        return products
            .filter(
                (p) =>
                    matchesSearchQuery(p.name, q) ||
                    normalizeBarcode(p.barCode).includes(normalizeBarcode(q)),
            )
            .slice(0, 6);
    }, [inputValue, products]);

    const openForProduct = useCallback((product: Product) => {
        setPendingProduct(product);
        setNotFoundCode(null);
        setInputValue('');
    }, []);

    const handleBarcode = useCallback(
        (barcode: string) => {
            const product = findProductByBarcode(barcodeIndex, barcode);

            if (product) {
                openForProduct(product);
            } else {
                playScanError();
                setNotFoundCode(normalizeBarcode(barcode));
            }
        },
        [barcodeIndex, openForProduct],
    );

    const handleManualSubmit = useCallback(() => {
        const value = inputValue.trim();

        if (!value) return;

        const product =
            findProductByBarcode(barcodeIndex, value) ??
            findProductByNameOrBarcode(products, value);

        if (product) {
            openForProduct(product);
        } else {
            playScanError();
            setNotFoundCode(value);
        }
    }, [inputValue, barcodeIndex, products, openForProduct]);

    const anyModalOpen = scannerOpen || Boolean(pendingProduct);

    useHardwareBarcodeScanner({
        onScan: handleBarcode,
        enabled: !anyModalOpen,
    });

    const handleConfirmRestock = async (amountToAdd: number) => {
        if (!pendingProduct) return;

        const newTotal = await incrementQuantity.mutateAsync({
            id: pendingProduct.id,
            delta: amountToAdd,
        });

        playScanSuccess();

        setLog((prev) => [
            {
                key: `${pendingProduct.id}-${Date.now()}`,
                productId: pendingProduct.id,
                name: pendingProduct.name,
                added: amountToAdd,
                unit:
                    pendingProduct.saleUnit === 'weight'
                        ? pendingProduct.weightUnit ?? 'kg'
                        : 'pcs',
                newTotal,
                at: new Date().toISOString(),
                undone: false,
            },
            ...prev,
        ]);

        setPendingProduct(null);
    };

    const handleUndo = async (entry: LogEntry) => {
        await incrementQuantity.mutateAsync({
            id: entry.productId,
            delta: -entry.added,
        });

        setLog((prev) =>
            prev.map((e) =>
                e.key === entry.key ? {...e, undone: true} : e,
            ),
        );
    };

    return (
        <AppShell title="Add inventory">
            <div className="p-4 md:p-6">
                <p className="mb-4 text-sm text-muted-foreground">
                    Scan or search a product, enter how many (or how much)
                    arrived, and it&apos;s added on top of the current stock —
                    nothing here overwrites existing quantity.
                </p>

                <Card className="mb-4 p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                            <Input
                                autoFocus
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleManualSubmit();
                                    }
                                }}
                                placeholder="Scan or search product / barcode"
                                className="h-12 text-base"
                                aria-label="Scan or search product to restock"
                            />

                            {suggestions.length > 0 && (
                                <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border bg-popover shadow-md">
                                    {suggestions.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => openForProduct(p)}
                                            className="flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                                        >
                                            <span>
                                                {p.name}{' '}
                                                <span className="tabular text-muted-foreground">
                                                    · {p.barCode}
                                                </span>
                                            </span>

                                            <span className="tabular text-muted-foreground">
                                                {p.quantity} in stock
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Button
                            size="lg"
                            className="h-12 shrink-0"
                            onClick={openScanner}
                        >
                            <ScanLine className="h-5 w-5" />
                            Scan barcode
                        </Button>
                    </div>
                </Card>

                {notFoundCode && (
                    <Card className="mb-4 border-warning/40 bg-warning/5">
                        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                            <p className="font-medium">Barcode not found</p>

                            <p className="tabular text-sm text-muted-foreground">
                                {notFoundCode}
                            </p>

                            <Button asChild size="sm">
                                <Link
                                    href={`/products/new?barcode=${encodeURIComponent(
        notFoundCode,
    )}`}
                                >
                                    Create product
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                    This session
                </h2>

                {log.length === 0 ? (
                    <EmptyState
                        icon={PackageCheck}
                        title="Nothing added yet"
                        description="Items you restock will show up here."
                    />
                ) : (
                    <div className="flex flex-col gap-2">
                        {log.map((entry) => (
                            <Card
                                key={entry.key}
                                className={`p-3 ${
    entry.undone ? 'opacity-50' : ''
}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {entry.name}
                                        </p>

                                        <p className="tabular text-xs text-muted-foreground">
                                            {formatDateTime(entry.at)} · +
                                            {entry.added} {entry.unit} · now{' '}
                                            {entry.newTotal} {entry.unit}
                                            {entry.undone && ' · undone'}
                                        </p>
                                    </div>

                                    {!entry.undone && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Undo restock of ${entry.name}`}
                                            onClick={() => handleUndo(entry)}
                                        >
                                            <Undo2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {scannerMounted && (
                <BarcodeScanner
                    open={scannerOpen}
                    onOpenChange={setScannerOpen}
                    onDetect={(code) => {
                        handleBarcode(code);
                        setScannerOpen(false);
                    }}
                    feedback={null}
                    showSummary={false}
                />
            )}

            <RestockQuantityDialog
                key={pendingProduct?.id ?? 'none'}
                product={pendingProduct}
                onOpenChange={(open) =>
                    !open && setPendingProduct(null)
                }
                onConfirm={handleConfirmRestock}
            />
        </AppShell>
    );
}