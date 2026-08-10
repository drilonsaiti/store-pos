import Papa from 'papaparse';
import type {Product, ProductInput} from '@/types/product';
import type {Sale} from '@/types/sale';

export function downloadCsv(filename: string, csv: string) {
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const PRODUCT_COLUMNS = ['name', 'barCode', 'price', 'purchasePrice', 'quantity'] as const;

export function productsToCsv(products: Product[]): string {
    return Papa.unparse({
        fields: [...PRODUCT_COLUMNS],
        // barCode forced to a leading-space-free string — Papa would otherwise let
        // spreadsheet apps re-interpret a numeric-looking barcode and drop zeroes.
        data: products.map((p) => PRODUCT_COLUMNS.map((col) => String(p[col]))),
    });
}

export interface ProductCsvRow {
    row: number;
    data: ProductInput;
}

export interface ProductCsvError {
    row: number;
    message: string;
}

export interface ParseProductsCsvResult {
    rows: ProductCsvRow[];
    errors: ProductCsvError[];
}

/**
 * Parses a product import CSV. Expects headers: name, barCode, price,
 * purchasePrice, quantity (case-insensitive, order-independent). Never
 * coerces barCode to a number — it's read back exactly as typed in the file.
 */
export function parseProductsCsv(text: string): ParseProductsCsvResult {
    const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
    });

    const rows: ProductCsvRow[] = [];
    const errors: ProductCsvError[] = [];

    parsed.data.forEach((raw, i) => {
        const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
        const name = (raw.name ?? '').trim();
        const barCode = (raw.barcode ?? '').trim();
        const price = Number(raw.price);
        const purchasePrice = Number(raw.purchaseprice ?? raw['purchase price']);
        const quantity = Number(raw.quantity);

        if (!name) {
            errors.push({row: rowNumber, message: 'Missing product name'});
            return;
        }
        if (!barCode) {
            errors.push({row: rowNumber, message: 'Missing barcode'});
            return;
        }
        if (!Number.isFinite(price) || price < 0) {
            errors.push({row: rowNumber, message: `Invalid price "${raw.price}"`});
            return;
        }
        if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
            errors.push({row: rowNumber, message: `Invalid purchase price`});
            return;
        }
        if (!Number.isFinite(quantity) || quantity < 0) {
            errors.push({row: rowNumber, message: `Invalid quantity "${raw.quantity}"`});
            return;
        }

        rows.push({row: rowNumber, data: {name, barCode, price, purchasePrice, quantity}});
    });

    return {rows, errors};
}

/** Flattened one-row-per-line-item export — useful for accounting/reporting. */
export function salesToCsv(sales: Sale[]): string {
    const fields = ['saleId', 'date', 'product', 'barCode', 'unitPrice', 'quantity', 'subtotal', 'saleTotal'];
    const data = sales.flatMap((sale) =>
        sale.products.map((line) => [
            sale.id,
            sale.date,
            line.name,
            line.barCode,
            String(line.price),
            String(line.quantity),
            String(line.price * line.quantity),
            String(sale.totalPrice),
        ])
    );
    return Papa.unparse({fields, data});
}