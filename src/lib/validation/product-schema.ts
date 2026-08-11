import {z} from 'zod';

export const productSchema = z
    .object({
        name: z.string().trim().min(1, 'Product name is required'),
        barCode: z
            .string()
            .trim()
            .min(1, 'Barcode is required')
            .regex(/^[0-9A-Za-z-]+$/, 'Barcode can only contain letters, numbers and hyphens'),
        price: z.coerce.number().min(0, 'Selling price must be 0 or more'),
        purchasePrice: z.coerce.number().min(0, 'Purchase price must be 0 or more'),
        // Not an integer check anymore — weight-tracked stock can be fractional (e.g. 12.5 kg on hand).
        quantity: z.coerce.number().min(0, 'Quantity must be 0 or more'),
        saleUnit: z.enum(['piece', 'weight']),
        weightUnit: z.enum(['kg', 'g']).optional(),
        packageEnabled: z.boolean().optional(),
        piecesPerPackage: z.coerce.number().optional(),
        packagePrice: z.coerce.number().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.saleUnit === 'weight' && !data.weightUnit) {
            ctx.addIssue({code: z.ZodIssueCode.custom, path: ['weightUnit'], message: 'Choose kg or g'});
        }
        if (data.saleUnit === 'piece' && data.packageEnabled) {
            if (!data.piecesPerPackage || data.piecesPerPackage <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['piecesPerPackage'],
                    message: 'Enter pieces per package'
                });
            }
            if (!data.packagePrice || data.packagePrice <= 0) {
                ctx.addIssue({code: z.ZodIssueCode.custom, path: ['packagePrice'], message: 'Enter package price'});
            }
        }
    });

export type ProductFormValues = z.infer<typeof productSchema>;