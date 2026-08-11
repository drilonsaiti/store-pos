'use client';

import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useRouter} from 'next/navigation';
import {type ProductFormValues, productSchema} from '@/lib/validation/product-schema';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent} from '@/components/ui/card';
import type {Product, ProductInput} from '@/types/product';

interface Props {
    product?: Product;
    onSubmit: (values: ProductInput) => Promise<void>;
    submitLabel: string;
}

export function ProductForm({product, onSubmit, submitLabel}: Props) {
    const router = useRouter();
    const {
        register,
        handleSubmit,
        watch,
        formState: {errors, isSubmitting},
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: product?.name ?? '',
            barCode: product?.barCode ?? '',
            price: product?.price ?? 0,
            purchasePrice: product?.purchasePrice ?? 0,
            quantity: product?.quantity ?? 0,
            saleUnit: product?.saleUnit ?? 'piece',
            weightUnit: product?.weightUnit ?? 'kg',
            packageEnabled: Boolean(product?.packageOption),
            piecesPerPackage: product?.packageOption?.piecesPerPackage,
            packagePrice: product?.packageOption?.packagePrice,
        },
    });

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
        await onSubmit(productInput);
    });

    return (
        <Card className="mx-auto max-w-xl">
            <CardContent className="pt-5">
                <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="name">Product name</Label>
                        <Input id="name" autoFocus {...register('name')} aria-invalid={Boolean(errors.name)}/>
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="barCode">Barcode</Label>
                        <Input id="barCode" inputMode="numeric" className="tabular" {...register('barCode')}
                               aria-invalid={Boolean(errors.barCode)}/>
                        <p className="text-xs text-muted-foreground">Stored as text — leading zeroes are preserved.</p>
                        {errors.barCode && <p className="text-sm text-destructive">{errors.barCode.message}</p>}
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
                            <Label htmlFor="weightUnit">Weight unit</Label>
                            <select
                                id="weightUnit"
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
                            <Label htmlFor="price">
                                {saleUnit === 'weight' ? `Price per ${weightUnit ?? 'kg'}` : 'Selling price'}
                            </Label>
                            <Input id="price" type="number" step="0.01" min="0" {...register('price')}
                                   aria-invalid={Boolean(errors.price)}/>
                            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="purchasePrice">Purchase price</Label>
                            <Input
                                id="purchasePrice"
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
                            htmlFor="quantity">{saleUnit === 'weight' ? `Stock (${weightUnit ?? 'kg'})` : 'Quantity'}</Label>
                        <Input
                            id="quantity"
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
                                        <Label htmlFor="piecesPerPackage">Pieces per package</Label>
                                        <Input id="piecesPerPackage" type="number" step="1"
                                               min="1" {...register('piecesPerPackage')} />
                                        {errors.piecesPerPackage &&
                                            <p className="text-sm text-destructive">{errors.piecesPerPackage.message}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="packagePrice">Package price</Label>
                                        <Input id="packagePrice" type="number" step="0.01"
                                               min="0" {...register('packagePrice')} />
                                        {errors.packagePrice &&
                                            <p className="text-sm text-destructive">{errors.packagePrice.message}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button type="submit" disabled={isSubmitting} className="flex-1">
                            {isSubmitting ? 'Saving…' : submitLabel}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}