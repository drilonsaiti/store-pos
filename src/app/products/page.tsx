'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {Download, Package, Plus, ScanLine, Upload, PackagePlus } from 'lucide-react';
import {AppShell} from '@/components/layout/app-shell';
import {ProductSearch} from '@/components/products/product-search';
import {ProductTable} from '@/components/products/product-table';
import {ProductCardList} from '@/components/products/product-card';
import {ImportProductsDialog} from '@/components/products/import-products-dialog';
import {ConfirmDialog} from '@/components/ui/confirm-dialog';
import {EmptyState} from '@/components/ui/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {Button} from '@/components/ui/button';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {useDeleteProduct, useProducts} from '@/hooks/use-products';
import {useLowStockThreshold} from '@/hooks/use-low-stock-threshold';
import {useDebouncedValue} from '@/hooks/use-debounced-value';
import {useInfiniteList} from '@/hooks/use-infinite-list';
import {getStockStatus, type Product, type StockStatus} from '@/types/product';
import {normalizeBarcode} from '@/lib/utils/barcode';
import {matchesSearchQuery} from '@/lib/utils/search';
import {downloadCsv, productsToCsv} from '@/lib/utils/csv';

type Filter = 'all' | StockStatus;

// Camera scanner is code-split — only fetched if the "Scan" button is used.
const BarcodeScanner = dynamic(
    () => import('@/components/scanner/barcode-scanner').then((m) => m.BarcodeScanner),
    {ssr: false}
);

export default function ProductsPage() {
    const {data: products, isLoading, isError} = useProducts();
    const deleteProduct = useDeleteProduct();
    const {threshold} = useLowStockThreshold();
    const [queryInput, setQueryInput] = useState('');
    const query = useDebouncedValue(queryInput, 200);
    const [filter, setFilter] = useState<Filter>('all');
    const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);

    const filtered = useMemo(() => {
        if (!products) return [];
        const barcodeQuery = normalizeBarcode(query).toLowerCase();
        return products
            .filter((p) => (filter === 'all' ? true : getStockStatus(p.quantity, threshold) === filter))
            .filter((p) =>
                query.trim() === ''
                    ? true
                    : matchesSearchQuery(p.name, query) || normalizeBarcode(p.barCode).toLowerCase().includes(barcodeQuery)
            );
    }, [products, query, filter, threshold]);

    const {visible, hasMore, loadMore, sentinelRef} = useInfiniteList(filtered, 20);

    return (
        <AppShell title="Products">
            <div className="p-4 md:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 gap-2">
                        <ProductSearch value={queryInput} onChange={setQueryInput}/>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 shrink-0"
                            aria-label="Search by scanning a barcode"
                            onClick={() => setScannerOpen(true)}
                        >
                            <ScanLine className="h-4 w-4"/>
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="lg" className="sm:size-default" asChild>
                            <Link href="/products/restock">
                                <PackagePlus className="h-4 w-4" />
                                <span className="hidden sm:inline">Add inventory</span>
                            </Link>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="lg" className="sm:size-default">
                                    <Download className="h-4 w-4"/>
                                    <span className="hidden sm:inline">Export</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => downloadCsv('products.csv', productsToCsv(filtered))}
                                    disabled={filtered.length === 0}
                                >
                                    Export {filtered.length === products?.length ? 'all' : 'filtered'} as CSV
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="lg" className="sm:size-default"
                                onClick={() => setImportOpen(true)}>
                            <Upload className="h-4 w-4"/>
                            <span className="hidden sm:inline">Import</span>
                        </Button>
                        <Button asChild size="lg" className="sm:size-default">
                            <Link href="/products/new">
                                <Plus className="h-4 w-4"/>
                                Add product
                            </Link>
                        </Button>
                    </div>
                </div>

                <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-5">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="in-stock">In stock</TabsTrigger>
                        <TabsTrigger value="low-stock">Low stock</TabsTrigger>
                        <TabsTrigger value="out-of-stock">Out of stock</TabsTrigger>
                    </TabsList>
                </Tabs>

                {isLoading && (
                    <div className="flex flex-col gap-3">
                        {Array.from({length: 6}).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full"/>
                        ))}
                    </div>
                )}

                {isError && (
                    <EmptyState
                        icon={Package}
                        title="Could not load products"
                        description="Check your connection and try refreshing the page."
                    />
                )}

                {!isLoading && !isError && products && products.length === 0 && (
                    <EmptyState
                        icon={Package}
                        title="No products yet"
                        description="Add your first product to start managing inventory."
                        action={
                            <Button asChild>
                                <Link href="/products/new">Add product</Link>
                            </Button>
                        }
                    />
                )}

                {!isLoading && !isError && products && products.length > 0 && filtered.length === 0 && (
                    <EmptyState icon={Package} title="No matches" description="Try a different search term or filter."/>
                )}

                {visible.length > 0 && (
                    <>
                        <ProductTable products={visible} onDelete={setPendingDelete}/>
                        <ProductCardList products={visible} onDelete={setPendingDelete}/>

                        <div ref={sentinelRef} className="h-1"/>
                        {hasMore && (
                            <div className="mt-4 flex justify-center">
                                <Button variant="outline" onClick={loadMore}>
                                    Load more ({filtered.length - visible.length} remaining)
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                onOpenChange={(open) => !open && setPendingDelete(null)}
                title="Delete product?"
                description={`${pendingDelete?.name ?? 'This product'} will be permanently removed.`}
                confirmLabel="Delete"
                onConfirm={() => pendingDelete && deleteProduct.mutate(pendingDelete.id)}
            />
            <ImportProductsDialog open={importOpen} onOpenChange={setImportOpen}/>
            {scannerOpen && (
                <BarcodeScanner
                    open={scannerOpen}
                    onOpenChange={setScannerOpen}
                    onDetect={(code) => {
                        setQueryInput(code);
                        setScannerOpen(false);
                    }}
                    feedback={null}
                    showSummary={false}
                />
            )}
        </AppShell>
    );
}