import { Badge } from '@/components/ui/badge';
import { getStockStatus, type StockStatus } from '@/types/product';

const LABELS: Record<StockStatus, string> = {
  'in-stock': 'In stock',
  'low-stock': 'Low stock',
  'out-of-stock': 'Out of stock',
};

const VARIANTS: Record<StockStatus, 'success' | 'warning' | 'destructive'> = {
  'in-stock': 'success',
  'low-stock': 'warning',
  'out-of-stock': 'destructive',
};

export function StockBadge({ quantity }: { quantity: number }) {
  const status = getStockStatus(quantity);
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
