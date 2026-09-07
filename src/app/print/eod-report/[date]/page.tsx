'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useParams} from 'next/navigation';
import {RequireAuth} from '@/components/auth/require-auth';
import {useSales} from '@/hooks/use-sales';
import {useCurrency} from '@/hooks/use-currency';
import {formatCurrency} from '@/lib/utils/currency';
import {formatDateTime} from '@/lib/utils/dates';
import {buildEndOfDayReport} from '@/lib/utils/reports';

export default function EndOfDayReportPrintPage() {
    const {date} = useParams<{ date: string }>();
    const {data: sales, isLoading} = useSales();
    const {currency} = useCurrency();
    const autoPrintedRef = useRef(false);

    const report = useMemo(() => {
        const [y, m, d] = date.split('-').map(Number);
        return buildEndOfDayReport(sales ?? [], new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1));
    }, [sales, date]);


    useEffect(() => {
        if (isLoading || autoPrintedRef.current) return;

        autoPrintedRef.current = true;

        const t = window.setTimeout(() => {
            window.print();
        }, 300);

        return () => window.clearTimeout(t);
    }, [isLoading]);

    return (
        <RequireAuth>
            <div className="mx-auto max-w-md bg-white p-4 text-black print:max-w-none print:p-0">
                {isLoading && <p className="text-center text-sm">Loading report…</p>}
                {!isLoading && (
                    <div className="font-mono text-xs leading-relaxed">
                        <p className="text-center text-sm font-bold">Store Console</p>
                        <p className="text-center">End of day report — {report.date}</p>
                        <div className="my-2 border-t border-dashed border-black"/>
                        <div className="mb-1 flex justify-between">
                            <span>Total sales</span>
                            <span>{report.salesCount}</span>
                        </div>
                        <div className="mb-1 flex justify-between">
                            <span>Items sold</span>
                            <span>{report.totalQuantity}</span>
                        </div>
                        <div className="mb-1 flex justify-between font-bold">
                            <span>Revenue</span>
                            <span>{formatCurrency(report.totalRevenue, currency)}</span>
                        </div>
                        <div className="my-2 border-t border-dashed border-black"/>
                        <p className="mb-1 font-bold">By employee</p>
                        {report.byEmployee.length === 0 && <p>No sales.</p>}
                        {report.byEmployee.map((line) => (
                            <div key={line.employeeId} className="mb-1 flex justify-between gap-2">
                <span className="flex-1">
                  {line.employeeName} ({line.salesCount})
                </span>
                                <span className="tabular shrink-0">{formatCurrency(line.totalRevenue, currency)}</span>
                            </div>
                        ))}
                        <div className="my-2 border-t border-dashed border-black"/>
                        <p className="mb-1 font-bold">Transactions</p>
                        {report.sales.map((sale) => (
                            <div key={sale.id} className="mb-1 flex justify-between gap-2">
                <span className="flex-1">
                  #{sale.id.slice(-6).toUpperCase()} {formatDateTime(sale.date)}
                </span>
                                <span className="tabular shrink-0">{formatCurrency(sale.totalPrice, currency)}</span>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={() => window.print()}
                        className="mt-6 w-full rounded-md border border-black py-2 text-sm print:hidden">
                    Print
                </button>
            </div>
        </RequireAuth>
    );
}