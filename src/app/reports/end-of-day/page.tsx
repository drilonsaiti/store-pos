'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {Boxes, Printer, ShoppingBag, TrendingUp} from 'lucide-react';
import {AppShell} from '@/components/layout/app-shell';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Skeleton} from '@/components/ui/skeleton';
import {KpiCard} from '@/components/dashboard/kpi-card';
import {useSales} from '@/hooks/use-sales';
import {useFormatCurrency} from '@/hooks/use-currency';
import {buildEndOfDayReport, toDateKey} from '@/lib/utils/reports';
import {formatDateTime} from '@/lib/utils/dates';

export default function EndOfDayReportPage() {
    const {data: sales, isLoading} = useSales();
    const fmt = useFormatCurrency();
    const [dateInput, setDateInput] = useState(() => toDateKey(new Date()));

    const report = useMemo(() => {
        const [y, m, d] = dateInput.split('-').map(Number);
        return buildEndOfDayReport(sales ?? [], new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1));
    }, [sales, dateInput]);

    return (
        <AppShell title="End of day report">
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)}
                           className="max-w-[180px]"/>
                    <Button asChild variant="outline">
                        <Link href={`/print/eod-report/${dateInput}`} target="_blank">
                            <Printer className="h-4 w-4"/>
                            Print report
                        </Link>
                    </Button>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-3 gap-4">
                        {Array.from({length: 3}).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full"/>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <KpiCard label="Revenue" value={fmt(report.totalRevenue)} icon={TrendingUp}/>
                        <KpiCard label="Sales" value={String(report.salesCount)} icon={ShoppingBag}/>
                        <KpiCard label="Items sold" value={String(report.totalQuantity)} icon={Boxes}/>
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>By employee</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {report.byEmployee.length === 0 && !isLoading && (
                            <p className="text-sm text-muted-foreground">No sales on this date.</p>
                        )}
                        {report.byEmployee.length > 0 && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead className="text-right">Sales</TableHead>
                                        <TableHead className="text-right">Items</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.byEmployee.map((line) => (
                                        <TableRow key={line.employeeId}>
                                            <TableCell className="font-medium">{line.employeeName}</TableCell>
                                            <TableCell className="tabular text-right">{line.salesCount}</TableCell>
                                            <TableCell className="tabular text-right">{line.totalQuantity}</TableCell>
                                            <TableCell
                                                className="tabular text-right font-medium">{fmt(line.totalRevenue)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Transactions</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {report.sales.length === 0 && !isLoading && (
                            <p className="text-sm text-muted-foreground">No sales on this date.</p>
                        )}
                        {report.sales.length > 0 && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sale</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Cashier</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.sales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/sales/${sale.id}`} className="hover:underline">
                                                    #{sale.id.slice(-6).toUpperCase()}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{formatDateTime(sale.date)}</TableCell>
                                            <TableCell>{sale.employeeName ?? 'Unassigned'}</TableCell>
                                            <TableCell
                                                className="tabular text-right font-medium">{fmt(sale.totalPrice)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}