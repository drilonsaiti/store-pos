import Papa from 'papaparse';
import type {Product, ProductInput, WeightUnit} from '@/types/product';
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

const PRODUCT_FIELDS = [
    'name',
    'barCode',
    'price',
    'purchasePrice',
    'quantity',
    'saleUnit',
    'weightUnit',
    'piecesPerPackage',
    'packagePrice',
] as const;

export function productsToCsv(products: Product[]): string {
    const data = products.map((p) => [
        csvSafe(p.name),
        csvSafe(p.barCode),
        String(p.price),
        String(p.purchasePrice),
        String(p.quantity),
        csvSafe(p.saleUnit),
        csvSafe(p.weightUnit ?? 'kg'),
        p.packageOption ? String(p.packageOption.piecesPerPackage) : '',
        p.packageOption ? String(p.packageOption.packagePrice) : '',
    ]);

    return Papa.unparse({fields: [...PRODUCT_FIELDS], data});
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
 * Parses a product import CSV. Required columns: name, barCode, price,
 * purchasePrice, quantity. Optional: saleUnit ("piece"/"weight", defaults
 * to piece), weightUnit ("kg"/"g", defaults to kg), piecesPerPackage +
 * packagePrice (both required together to enable package pricing).
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
        const rowNumber = i + 2;
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
            errors.push({row: rowNumber, message: 'Invalid purchase price'});
            return;
        }
        if (!Number.isFinite(quantity) || quantity < 0) {
            errors.push({row: rowNumber, message: `Invalid quantity "${raw.quantity}"`});
            return;
        }

        const saleUnit =
            (raw.saleunit ?? 'piece').trim().toLowerCase() === 'weight'
                ? 'weight'
                : 'piece';

        const weightUnit: WeightUnit =
            (raw.weightunit ?? 'kg').trim().toLowerCase() === 'g'
                ? 'g'
                : 'kg';

        const piecesPerPackage = Number(raw.piecesperpackage);
        const packagePrice = Number(raw.packageprice);

        const packageOption =
            Number.isFinite(piecesPerPackage) &&
            piecesPerPackage > 0 &&
            Number.isFinite(packagePrice) &&
            packagePrice > 0
                ? {piecesPerPackage, packagePrice}
                : null;

        rows.push({
            row: rowNumber,
            data: {
                name,
                barCode,
                price,
                purchasePrice,
                quantity,
                saleUnit,
                weightUnit,
                packageOption,
            },
        });
    });

    return {rows, errors};
}

export function salesToCsv(sales: Sale[]): string {
    const fields = [
        'saleId',
        'date',
        'product',
        'barCode',
        'unit',
        'unitPrice',
        'quantity',
        'subtotal',
        'saleTotal',
    ];

    const data = sales.flatMap((sale) =>
        sale.products.map((line) => [
            csvSafe(sale.id),
            csvSafe(sale.date),
            csvSafe(line.name),
            csvSafe(line.barCode),
            csvSafe(
                line.unitLabel ??
                    (line.mode === 'package' ? 'package' : 'pc')
            ),
            String(line.price),
            String(line.quantity),
            String(line.price * line.quantity),
            String(sale.totalPrice),
        ])
    );

    return Papa.unparse({fields, data});
}

function csvSafe(value: string): string {
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

