'use client';

import {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useCreateProduct} from '@/hooks/use-products';
import type {Product, ProductInput} from '@/types/product';

const quickAddSchema = z.object({
    name: z.string().trim().min(1, 'Product name is required'),
    barCode: z.string().trim().min(1, 'Barcode is required'),
    price: z.coerce.number().min(0, 'Selling price must be 0 or more'),
    purchasePrice: z.coerce.number().min(0, 'Purchase price must be 0 or more'),
    quantity: z.coerce.number().int().min(0, 'Quantity must be 0 or more'),
});
type QuickAddValues = z.infer<typeof quickAddSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    barcode: string;
    onCreated: (product: Product) => void;
}

/**
 * Fast-path product creation from the POS itself — a cashier scans an
 * unregistered barcode, fills in name + price right there, and the new
 * product goes straight into the cart as a plain piece-sold item. For
 * weight- or package-priced products, use the full form under Products —
 * this dialog is deliberately minimal to stay fast.
 */
export function QuickAddProductDialog({open, onOpenChange, barcode, onCreated}: Props) {
    const createProduct = useCreateProduct();
    const {
        register,
        handleSubmit,
        reset,
        formState: {errors, isSubmitting},
    } = useForm<QuickAddValues>({
        resolver: zodResolver(quickAddSchema),
        defaultValues: {name: '', barCode: barcode, price: 0, purchasePrice: 0, quantity: 0},
    });

    useEffect(() => {
        if (open) reset({name: '', barCode: barcode, price: 0, purchasePrice: 0, quantity: 0});
    }, [open, barcode, reset]);

    const submit = handleSubmit(async (values) => {
        const productInput: ProductInput = {
            ...values,
            saleUnit: 'piece',
            weightUnit: 'kg',
            packageOption: null,
        };
        const created = await createProduct.mutateAsync(productInput);
        onOpenChange(false);
        onCreated(created);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add new product</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="qa-barcode">Barcode</Label>
                        <Input id="qa-barcode" className="tabular" readOnly {...register('barCode')} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="qa-name">Product name</Label>
                        <Input id="qa-name" autoFocus {...register('name')} aria-invalid={Boolean(errors.name)}/>
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="qa-price">Selling price</Label>
                            <Input id="qa-price" type="number" step="0.01" min="0" {...register('price')}
                                   aria-invalid={Boolean(errors.price)}/>
                            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="qa-quantity">Quantity</Label>
                            <Input id="qa-quantity" type="number" step="1" min="0" {...register('quantity')}
                                   aria-invalid={Boolean(errors.quantity)}/>
                            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding…' : 'Add & scan into cart'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}