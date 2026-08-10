'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {Download, Package, Plus, Upload} from 'lucide-react';
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
import {getStockStatus, type Product, type StockStatus} from '@/types/product';
import {normalizeBarcode} from '@/lib/utils/barcode';
import {downloadCsv, productsToCsv} from '@/lib/utils/csv';
import {useLowStockThreshold} from '@/hooks/use-low-stock-threshold';

type Filter = 'all' | StockStatus;

export default function ProductsPage() {
    const {data: products, isLoading, isError} = useProducts();
    const deleteProduct = useDeleteProduct();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const {threshold} = useLowStockThreshold();

    const filtered = useMemo(() => {
        if (!products) return [];
        const q = normalizeBarcode(query).toLowerCase();
        return products
            .filter((p) => (filter === 'all' ? true : getStockStatus(p.quantity, threshold) === filter))
            .filter((p) => (q ? p.name.toLowerCase().includes(q) || normalizeBarcode(p.barCode).toLowerCase().includes(q) : true));
    }, [products, query, filter, threshold]);

    return (
        <AppShell title="Products">
            <div className="p-4 md:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 gap-3">
                        <ProductSearch value={query} onChange={setQuery}/>
                    </div>
                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="lg" className="sm:size-default">
                                    <Upload className="h-4 w-4"/>

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
                            <Download className="h-4 w-4"/>
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

                {filtered.length > 0 && (
                    <>
                        <ProductTable products={filtered} onDelete={setPendingDelete}/>
                        <ProductCardList products={filtered} onDelete={setPendingDelete}/>
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
        </AppShell>
    );
}