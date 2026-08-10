import {z} from 'zod';

export const productSchema = z.object({
    name: z.string().trim().min(1, 'Product name is required'),
    barCode: z
        .string()
        .trim()
        .min(1, 'Barcode is required')
        .regex(/^[0-9A-Za-z-]+$/, 'Barcode can only contain letters, numbers and hyphens'),
    price: z.coerce.number().min(0, 'Selling price must be 0 or more'),
    purchasePrice: z.coerce.number().min(0, 'Purchase price must be 0 or more'),
    quantity: z.coerce.number().int('Quantity must be a whole number').min(0, 'Quantity must be 0 or more'),
});

export type ProductFormValues = z.infer<typeof productSchema>;
