import {describe, expect, it} from 'vitest';
import {parseProductsCsv, productsToCsv, salesToCsv} from '../csv';
import {Product} from '../../../types/product';
import {Sale} from '../../../types/sale';

function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
        id: 'p1',
        name: 'Widget',
        barCode: '123456',
        price: 2.5,
        purchasePrice: 1,
        quantity: 10,
        saleUnit: 'piece',
        weightUnit: 'kg',
        packageOption: null,
        ...overrides,
    };
}

function makeSale(overrides: Partial<Sale> = {}): Sale {
    return {
        id: 's1',
        date: '2026-01-05T12:00:00.000Z',
        products: [
            {
                idProduct: 'p1',
                name: 'Widget',
                barCode: '123456',
                price: 2.5,
                purchasePrice: 1,
                quantity: 2,
                date: '2026-01-05T12:00:00.000Z',
            },
        ],
        totalPrice: 5,
        totalQuantity: 2,
        ...overrides,
    };
}

function rowsOf(csv: string): string[][] {
    // Skip the header row; split naively since none of our fixtures contain
    // embedded commas/quotes that would need real CSV parsing to separate.
    return csv
        .trim()
        .split('\n')
        .slice(1)
        .map((line) => line.split(','));
}

function firstRow<T>(rows: T[]): T {
    const row = rows[0];

    if (!row) {
        throw new Error('Expected at least one row');
    }

    return row;
}

function firstError<T>(errors: T[]): T {
    const error = errors[0];

    if (!error) {
        throw new Error('Expected at least one error');
    }

    return error;
}

describe('productsToCsv (formula-injection guarding via csvSafe)', () => {
    it('leaves an ordinary product name untouched', () => {
        const csv = productsToCsv([makeProduct({name: 'Widget'})]);

        expect(firstRow(rowsOf(csv))[0]).toBe('Widget');
    });

    it('prefixes a name starting with "=" so it is not read as a spreadsheet formula', () => {
        const csv = productsToCsv([makeProduct({name: '=SUM(A1:A9)'})]);

        expect(firstRow(rowsOf(csv))[0]).toBe("'=SUM(A1:A9)");
    });

    it.each(['+1234', '-1234', '@SUM(A1)'])(
        'prefixes a name starting with "%s"',
        (dangerous) => {
            const csv = productsToCsv([makeProduct({name: dangerous})]);

            expect(firstRow(rowsOf(csv))[0]).toBe(`'${dangerous}`);
        },
    );

    it('prefixes a name starting with a tab character', () => {
        const csv = productsToCsv([makeProduct({name: '\t=cmd'})]);

        // The raw field starts with a quote-escaped tab; check the escaped
        // value carries the safety prefix rather than exact string slicing,
        // since a leading tab can shift how the line splits.
        expect(csv).toContain("'\t=cmd");
    });

    it('prefixes a name starting with a carriage return', () => {
        const csv = productsToCsv([makeProduct({name: '\r=cmd'})]);

        expect(csv).toContain("'\r=cmd");
    });

    it('does not prefix a name that merely contains, but does not start with, a dangerous character', () => {
        const csv = productsToCsv([makeProduct({name: 'Price = $5'})]);

        expect(firstRow(rowsOf(csv))[0]).toBe('Price = $5');
    });

    it('applies the same guarding to the barcode column', () => {
        const csv = productsToCsv([makeProduct({barCode: '=1+1'})]);

        expect(firstRow(rowsOf(csv))[1]).toBe("'=1+1");
    });
});

describe('salesToCsv', () => {
    it('applies csvSafe guarding to product-derived text fields', () => {
        const sale = makeSale({
            products: [
                {
                    idProduct: 'p1',
                    name: '=HYPERLINK("http://evil")',
                    barCode: '123456',
                    price: 1,
                    purchasePrice: 0.5,
                    quantity: 1,
                    date: '2026-01-05T12:00:00.000Z',
                },
            ],
        });

        const csv = salesToCsv([sale]);

        expect(csv).toContain("'=HYPERLINK");
    });

    it('produces one row per sale line item, not per sale', () => {
        const sale = makeSale({
            products: [
                {
                    idProduct: 'p1',
                    name: 'Widget',
                    barCode: '1',
                    price: 1,
                    purchasePrice: 0.5,
                    quantity: 1,
                    date: 'x',
                },
                {
                    idProduct: 'p2',
                    name: 'Gadget',
                    barCode: '2',
                    price: 2,
                    purchasePrice: 1,
                    quantity: 3,
                    date: 'x',
                },
            ],
        });

        const csv = salesToCsv([sale]);

        expect(rowsOf(csv)).toHaveLength(2);
    });

    it('computes subtotal as price * quantity per line', () => {
        const sale = makeSale({
            products: [
                {
                    idProduct: 'p1',
                    name: 'Widget',
                    barCode: '1',
                    price: 3,
                    purchasePrice: 1,
                    quantity: 4,
                    date: 'x',
                },
            ],
        });

        const csv = salesToCsv([sale]);
        const row = firstRow(rowsOf(csv));

        const [, , , , , unitPrice, quantity, subtotal] = row;

        expect(Number(unitPrice)).toBe(3);
        expect(Number(quantity)).toBe(4);
        expect(Number(subtotal)).toBe(12);
    });

    it('returns just a header row for no sales', () => {
        const csv = salesToCsv([]);

        expect(rowsOf(csv)).toHaveLength(0);
        expect(csv.trim().split('\n')).toHaveLength(1);
    });
});

describe('parseProductsCsv — valid rows', () => {
    it('parses a well-formed row into a ProductInput', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,123456,2.50,1.00,10';

        const {rows, errors} = parseProductsCsv(csv);

        expect(errors).toEqual([]);
        expect(rows).toHaveLength(1);

        const row = firstRow(rows);

        expect(row.data).toMatchObject({
            name: 'Widget',
            barCode: '123456',
            price: 2.5,
            purchasePrice: 1,
            quantity: 10,
            saleUnit: 'piece',
            weightUnit: 'kg',
            packageOption: null,
        });
    });

    it('reports the correct 1-based row number accounting for the header', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,1,1,1,1\nGadget,2,2,2,2';

        const {rows} = parseProductsCsv(csv);

        expect(rows.map((r) => r.row)).toEqual([2, 3]);
    });

    it('defaults saleUnit to piece and weightUnit to kg when omitted', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,1,1,1,1';

        const {rows} = parseProductsCsv(csv);
        const row = firstRow(rows);

        expect(row.data.saleUnit).toBe('piece');
        expect(row.data.weightUnit).toBe('kg');
    });

    it('parses saleUnit "weight" and weightUnit "g" case-insensitively', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity,saleUnit,weightUnit\nWidget,1,1,1,1,WEIGHT,G';

        const {rows} = parseProductsCsv(csv);
        const row = firstRow(rows);

        expect(row.data.saleUnit).toBe('weight');
        expect(row.data.weightUnit).toBe('g');
    });

    it('builds packageOption only when both piecesPerPackage and packagePrice are valid', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity,piecesPerPackage,packagePrice\nWidget,1,1,1,1,6,10';

        const {rows} = parseProductsCsv(csv);
        const row = firstRow(rows);

        expect(row.data.packageOption).toEqual({
            piecesPerPackage: 6,
            packagePrice: 10,
        });
    });

    it('leaves packageOption null when only one of the package fields is present', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity,piecesPerPackage\nWidget,1,1,1,1,6';

        const {rows} = parseProductsCsv(csv);
        const row = firstRow(rows);

        expect(row.data.packageOption).toBeNull();
    });

    it('accepts an alternate "purchase price" header with a space', () => {
        const csv =
            'name,barCode,price,purchase price,quantity\nWidget,1,1,1,1';

        const {rows, errors} = parseProductsCsv(csv);

        expect(errors).toEqual([]);

        const row = firstRow(rows);

        expect(row.data.purchasePrice).toBe(1);
    });
});

describe('parseProductsCsv — per-row validation errors', () => {
    it('flags a missing name', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\n,1,1,1,1';

        const {rows, errors} = parseProductsCsv(csv);

        expect(rows).toEqual([]);
        expect(errors).toHaveLength(1);
        expect(firstError(errors).message).toMatch(/name/i);
    });

    it('flags a missing barcode', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,,1,1,1';

        const {errors} = parseProductsCsv(csv);

        expect(errors).toHaveLength(1);
        expect(firstError(errors).message).toMatch(/barcode/i);
    });

    it('flags a negative price', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,1,-5,1,1';

        const {errors} = parseProductsCsv(csv);

        expect(errors).toHaveLength(1);
        expect(firstError(errors).message).toMatch(/price/i);
    });

    it('flags a non-numeric price', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,1,abc,1,1';

        const {errors} = parseProductsCsv(csv);

        expect(errors).toHaveLength(1);
        expect(firstError(errors).message).toMatch(/price/i);
    });

    it('flags a negative purchase price', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,1,1,-1,1';

        const {errors} = parseProductsCsv(csv);

        expect(errors).toHaveLength(1);
        expect(firstError(errors).message).toMatch(/purchase price/i);
    });

    it('flags a negative quantity', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,1,1,1,-1';

        const {errors} = parseProductsCsv(csv);

        expect(errors).toHaveLength(1);
        expect(firstError(errors).message).toMatch(/quantity/i);
    });

    it('continues past a bad row and still parses the valid ones', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\n' +
            'Bad,,1,1,1\n' +
            'Good,1,1,1,1';

        const {rows, errors} = parseProductsCsv(csv);

        expect(errors).toHaveLength(1);
        expect(rows).toHaveLength(1);

        expect(firstRow(rows).data.name).toBe('Good');
    });
});

describe('parseProductsCsv — duplicate barcode detection', () => {
    it('flags the second of two rows sharing a barcode within the same file', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\n' +
            'Widget,111,1,1,1\n' +
            'Other Widget,111,2,1,1';

        const {rows, errors} = parseProductsCsv(csv);

        expect(rows).toHaveLength(1);
        expect(firstRow(rows).data.name).toBe('Widget');

        expect(errors).toHaveLength(1);

        const error = firstError(errors);

        expect(error.row).toBe(3);
        expect(error.message).toMatch(/duplicate barcode/i);
    });

    it('flags a row whose barcode already exists in the catalog when existingBarcodes is provided', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,999,1,1,1';

        const {rows, errors} = parseProductsCsv(
            csv,
            new Set(['999']),
        );

        expect(rows).toEqual([]);
        expect(errors).toHaveLength(1);
        expect(firstError(errors).message).toMatch(
            /already exists in your catalog/i,
        );
    });

    it('does not flag a barcode absent from existingBarcodes', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,999,1,1,1';

        const {rows, errors} = parseProductsCsv(
            csv,
            new Set(['different-code']),
        );

        expect(errors).toEqual([]);
        expect(rows).toHaveLength(1);
    });

    it('defaults existingBarcodes to empty when the argument is omitted', () => {
        const csv =
            'name,barCode,price,purchasePrice,quantity\nWidget,999,1,1,1';

        const {errors} = parseProductsCsv(csv);

        expect(errors).toEqual([]);
    });
});