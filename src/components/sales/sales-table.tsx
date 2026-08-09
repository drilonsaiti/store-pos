'use client';

import Link from 'next/link';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import type { Sale } from '@/types/sale';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/dates';

export function SalesTable({ sales }: { sales: Sale[] }) {
  return (
    <>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale</TableHead>
              <TableHead>Date &amp; time</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">
                  <Link href={`/sales/${sale.id}`} className="hover:underline">
                    #{sale.id.slice(-6).toUpperCase()}
                  </Link>
                </TableCell>
                <TableCell>{formatDateTime(sale.date)}</TableCell>
                <TableCell className="tabular text-right">{sale.products?.length ?? 0}</TableCell>
                <TableCell className="tabular text-right">{sale.totalQuantity ?? 0}</TableCell>
                <TableCell className="tabular text-right font-medium">{formatCurrency(sale.totalPrice)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {sales.map((sale) => (
          <Link key={sale.id} href={`/sales/${sale.id}`}>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">#{sale.id.slice(-6).toUpperCase()}</span>
                <span className="tabular font-semibold">{formatCurrency(sale.totalPrice)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatDateTime(sale.date)}</span>
                <span className="tabular">{sale.totalQuantity ?? 0} items</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
