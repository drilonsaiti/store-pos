'use client';

import {useMemo} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {AlertTriangle, Boxes, Package, Plus, Receipt, ScanBarcode, ShoppingBag, TrendingUp, Wallet} from 'lucide-react';
import {AppShell} from '@/components/layout/app-shell';
import {KpiCard} from '@/components/dashboard/kpi-card';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {StockBadge} from '@/components/products/stock-badge';
import {useProducts} from '@/hooks/use-products';
import {useSales} from '@/hooks/use-sales';
import {formatCurrency} from '@/lib/utils/currency';
import {formatDateTime, isToday} from '@/lib/utils/dates';
import {getStockStatus, LOW_STOCK_THRESHOLD} from '@/types/product';
import {getDailyRevenue, getTopProducts} from '@/lib/utils/analytics';
import {useLowStockThreshold} from '@/hooks/use-low-stock-threshold';

// Recharts pulls in a sizeable bundle — load it only on the client, only for
// the dashboard route, instead of shipping it in every page's JS.
const RevenueChart = dynamic(() => import('@/components/dashboard/revenue-chart').then((m) => m.RevenueChart), {
    ssr: false,
    loading: () => <Skeleton className="h-[22rem] w-full lg:h-72"/>,
});
const TopProductsChart = dynamic(
    () => import('@/components/dashboard/top-products-chart').then((m) => m.TopProductsChart),
    {ssr: false, loading: () => <Skeleton className="h-[22rem] w-full lg:h-72"/>}
);

export default function DashboardPage() {
    const {data: products, isLoading: productsLoading} = useProducts();
    const {data: sales, isLoading: salesLoading} = useSales();
    const {threshold} = useLowStockThreshold();

    const metrics = useMemo(() => {
        const p = products ?? [];
        const s = sales ?? [];
        const todaySales = s.filter((sale) => isToday(sale.date));
        return {
            totalProducts: p.length,
            totalUnits: p.reduce((sum, x) => sum + x.quantity, 0),
            inventoryValue: p.reduce((sum, x) => sum + x.price * x.quantity, 0),
            lowStock: p.filter((x) => getStockStatus(x.quantity, threshold) !== 'in-stock'),
            todaySalesCount: todaySales.length,
            todayRevenue: todaySales.reduce((sum, sale) => sum + sale.totalPrice, 0),
            recentSales: s.slice(0, 5),
            dailyRevenue: getDailyRevenue(s),
            topProducts: getTopProducts(s),
        };
    }, [products, sales, threshold]);

    const isLoading = productsLoading || salesLoading;

    return (
        <AppShell title="Dashboard">
            <div className="flex flex-col gap-6 p-4 md:p-6">
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                        {Array.from({length: 6}).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full"/>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                        <KpiCard label="Products" value={String(metrics.totalProducts)} icon={Package}/>
                        <KpiCard label="Inventory units" value={metrics.totalUnits.toLocaleString()} icon={Boxes}/>
                        <KpiCard label="Inventory value" value={formatCurrency(metrics.inventoryValue)} icon={Wallet}/>
                        <KpiCard label="Today's sales" value={String(metrics.todaySalesCount)} icon={ShoppingBag}/>
                        <KpiCard label="Today's revenue" value={formatCurrency(metrics.todayRevenue)}
                                 icon={TrendingUp}/>
                        <KpiCard label="Low stock" value={String(metrics.lowStock.length)} icon={AlertTriangle}
                                 tone="warning"/>
                    </div>
                )}

                {!isLoading && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <RevenueChart data={metrics.dailyRevenue}/>
                        <TopProductsChart data={metrics.topProducts}/>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Low stock</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2 pt-0">
                            {metrics.lowStock.length === 0 && !isLoading && (
                                <p className="text-sm text-muted-foreground">Everything is above
                                    the {LOW_STOCK_THRESHOLD}-unit threshold.</p>
                            )}
                            {metrics.lowStock.slice(0, 6).map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/products/${product.id}`}
                                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-secondary"
                                >
                                    <span className="truncate">{product.name}</span>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <span className="tabular text-muted-foreground">{product.quantity} left</span>
                                        <StockBadge quantity={product.quantity}/>
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent sales</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2 pt-0">
                            {metrics.recentSales.length === 0 && !isLoading && (
                                <p className="text-sm text-muted-foreground">Completed sales will appear here.</p>
                            )}
                            {metrics.recentSales.map((sale) => (
                                <Link
                                    key={sale.id}
                                    href={`/sales/${sale.id}`}
                                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-secondary"
                                >
                                    <span>{formatDateTime(sale.date)}</span>
                                    <span className="tabular font-medium">{formatCurrency(sale.totalPrice)}</span>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <h2 className="mb-3 text-sm font-medium text-muted-foreground">Quick actions</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <QuickAction href="/sale" icon={ScanBarcode} label="New sale"/>
                        <QuickAction href="/products/new" icon={Plus} label="Add product"/>
                        <QuickAction href="/sale" icon={ScanBarcode} label="Scan barcode"/>
                        <QuickAction href="/sales" icon={Receipt} label="View sales"/>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

function QuickAction({href, icon: Icon, label}: { href: string; icon: typeof Plus; label: string }) {
    return (
        <Button variant="outline" size="lg" asChild className="h-20 flex-col gap-1.5 sm:h-24">
            <Link href={href}>
                <Icon className="h-5 w-5"/>
                <span className="text-sm">{label}</span>
            </Link>
        </Button>
    );
}