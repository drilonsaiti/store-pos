'use client';

import {useEffect, useState} from 'react';
import {useParams} from 'next/navigation';
import {useSale} from '@/hooks/use-sales';
import {formatDateTime} from '@/lib/utils/dates';
import {formatCurrency} from '@/lib/utils/currency';
import {useCurrency} from '@/hooks/use-currency';
import {RequireAuth} from '@/components/auth/require-auth';

/** Standalone print view — no sidebar/nav. Auto-triggers the print dialog
 * once the receipt has rendered; the on-screen button is a manual fallback
 * for browsers that block programmatic window.print() calls. */
export default function ReceiptPrintPage() {
    const {id} = useParams<{ id: string }>();
    const {data: sale, isLoading} = useSale(id);
    const {currency} = useCurrency();
    const [autoPrinted, setAutoPrinted] = useState(false);

    useEffect(() => {
        if (sale && !autoPrinted) {
            setAutoPrinted(true);
            const t = setTimeout(() => window.print(), 300);
            return () => clearTimeout(t);
        }
    }, [sale, autoPrinted]);

    return (
        <RequireAuth>
            <div className="mx-auto max-w-xs bg-white p-4 text-black print:max-w-none print:p-0">
                {isLoading && <p className="text-center text-sm">Loading receipt…</p>}
                {!isLoading && !sale && <p className="text-center text-sm">Sale not found.</p>}
                {sale && (
                    <div className="font-mono text-xs leading-relaxed">
                        <p className="text-center text-sm font-bold">Store Console</p>
                        <p className="text-center">{formatDateTime(sale.date)}</p>
                        <p className="text-center">Sale #{sale.id.slice(-6).toUpperCase()}</p>
                        <div className="my-2 border-t border-dashed border-black"/>
                        {sale.products.map((line, i) => (
                            <div key={`${line.idProduct}-${i}`} className="mb-1 flex justify-between gap-2">
                <span className="flex-1">
                  {line.name}
                    {line.unitLabel ? ` (${line.quantity} ${line.unitLabel})` : ` x${line.quantity}`}
                </span>
                                <span
                                    className="tabular shrink-0">{formatCurrency(line.price * line.quantity, currency)}</span>
                            </div>
                        ))}
                        <div className="my-2 border-t border-dashed border-black"/>
                        <div className="flex justify-between text-sm font-bold">
                            <span>TOTAL</span>
                            <span className="tabular">{formatCurrency(sale.totalPrice, currency)}</span>
                        </div>
                        {typeof sale.amountReceived === 'number' && (
                            <>
                                <div className="flex justify-between">
                                    <span>Cash received</span>
                                    <span className="tabular">{formatCurrency(sale.amountReceived, currency)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>Change</span>
                                    <span className="tabular">{formatCurrency(sale.changeDue ?? 0, currency)}</span>
                                </div>
                            </>
                        )}
                        <p className="mt-4 text-center">Thank you!</p>
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