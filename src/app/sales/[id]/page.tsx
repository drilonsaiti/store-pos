'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useSale } from '@/hooks/use-sales';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/dates';

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sale, isLoading } = useSale(id);

  return (
    <AppShell title="Sale details">
      <div className="p-4 md:p-6">
        {isLoading && <Skeleton className="h-72 w-full max-w-2xl" />}
        {!isLoading && !sale && <p className="text-muted-foreground">Sale not found.</p>}
        {sale && (
          <Card className="max-w-2xl">
            <CardContent className="pt-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Sale #{sale.id.slice(-6).toUpperCase()}</h2>
                <span className="text-sm text-muted-foreground">{formatDateTime(sale.date)}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.products.map((line, i) => (
                    <TableRow key={`${line.idProduct}-${i}`}>
                      <TableCell>{line.name}</TableCell>
                      <TableCell className="tabular text-right">{formatCurrency(line.price)}</TableCell>
                      <TableCell className="tabular text-right">{line.quantity}</TableCell>
                      <TableCell className="tabular text-right font-medium">
                        {formatCurrency(line.price * line.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="tabular text-2xl font-semibold">{formatCurrency(sale.totalPrice)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
