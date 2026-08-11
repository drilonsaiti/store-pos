'use client';

import {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useCreateProduct} from '@/hooks/use-products';
import {type ProductFormValues, productSchema} from '@/lib/validation/product-schema';
import type {Product, ProductInput} from '@/types/product';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    barcode: string;
    onCreated: (product: Product) => void;
}

const defaultValues = (barcode: string): ProductFormValues => ({
    name: '',
    barCode: barcode,
    price: 0,
    purchasePrice: 0,
    quantity: 0,
    saleUnit: 'piece',
    weightUnit: 'kg',
    packageEnabled: false,
    piecesPerPackage: undefined,
    packagePrice: undefined,
});

/**
 * Fast-path product creation from the POS itself — a cashier scans an
 * unregistered barcode and fills in the product right there. Mirrors
 * ProductForm's fields/schema exactly (sale unit, weight unit, package
 * option) so behavior stays consistent between the two entry points;
 * this is just the same form in a dialog instead of a full page.
 */
export function QuickAddProductDialog({open, onOpenChange, barcode, onCreated}: Props) {
    const createProduct = useCreateProduct();
    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: {errors, isSubmitting},
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: defaultValues(barcode),
    });

    useEffect(() => {
        if (open) reset(defaultValues(barcode));
    }, [open, barcode, reset]);

    const saleUnit = watch('saleUnit');
    const weightUnit = watch('weightUnit');
    const packageEnabled = watch('packageEnabled');

    const submit = handleSubmit(async (values) => {
        const productInput: ProductInput = {
            name: values.name,
            barCode: values.barCode,
            price: values.price,
            purchasePrice: values.purchasePrice,
            quantity: values.quantity,
            saleUnit: values.saleUnit,
            weightUnit: values.weightUnit ?? 'kg',
            packageOption:
                values.saleUnit === 'piece' && values.packageEnabled && values.piecesPerPackage && values.packagePrice
                    ? {piecesPerPackage: values.piecesPerPackage, packagePrice: values.packagePrice}
                    : null,
        };
        const created = await createProduct.mutateAsync(productInput);
        onOpenChange(false);
        onCreated(created);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
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

                    <div className="flex flex-col gap-1.5">
                        <Label>Sold by</Label>
                        <div className="flex gap-2">
                            <label
                                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:text-primary">
                                <input type="radio" value="piece" className="sr-only" {...register('saleUnit')} />
                                Piece
                            </label>
                            <label
                                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:text-primary">
                                <input type="radio" value="weight" className="sr-only" {...register('saleUnit')} />
                                Weight (kg/g)
                            </label>
                        </div>
                    </div>

                    {saleUnit === 'weight' && (
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="qa-weightUnit">Weight unit</Label>
                            <select
                                id="qa-weightUnit"
                                {...register('weightUnit')}
                                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="kg">Kilograms (kg)</option>
                                <option value="g">Grams (g)</option>
                            </select>
                            <p className="text-xs text-muted-foreground">Selling price below is
                                per {weightUnit ?? 'kg'}.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="qa-price">
                                {saleUnit === 'weight' ? `Price per ${weightUnit ?? 'kg'}` : 'Selling price'}
                            </Label>
                            <Input id="qa-price" type="number" step="0.01" min="0" {...register('price')}
                                   aria-invalid={Boolean(errors.price)}/>
                            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="qa-purchasePrice">Purchase price</Label>
                            <Input
                                id="qa-purchasePrice"
                                type="number"
                                step="0.01"
                                min="0"
                                {...register('purchasePrice')}
                                aria-invalid={Boolean(errors.purchasePrice)}
                            />
                            {errors.purchasePrice &&
                                <p className="text-sm text-destructive">{errors.purchasePrice.message}</p>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="qa-quantity">{saleUnit === 'weight' ? `Stock (${weightUnit ?? 'kg'})` : 'Quantity'}</Label>
                        <Input
                            id="qa-quantity"
                            type="number"
                            step={saleUnit === 'weight' ? '0.01' : '1'}
                            min="0"
                            {...register('quantity')}
                            aria-invalid={Boolean(errors.quantity)}
                        />
                        {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
                    </div>

                    {saleUnit === 'piece' && (
                        <div className="flex flex-col gap-3 rounded-md border p-3">
                            <label className="flex items-center gap-2 text-sm font-medium">
                                <input type="checkbox" {...register('packageEnabled')} className="h-4 w-4"/>
                                Also sell as a full package
                            </label>
                            {packageEnabled && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="qa-piecesPerPackage">Pieces per package</Label>
                                        <Input id="qa-piecesPerPackage" type="number" step="1"
                                               min="1" {...register('piecesPerPackage')} />
                                        {errors.piecesPerPackage &&
                                            <p className="text-sm text-destructive">{errors.piecesPerPackage.message}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="qa-packagePrice">Package price</Label>
                                        <Input id="qa-packagePrice" type="number" step="0.01"
                                               min="0" {...register('packagePrice')} />
                                        {errors.packagePrice &&
                                            <p className="text-sm text-destructive">{errors.packagePrice.message}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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