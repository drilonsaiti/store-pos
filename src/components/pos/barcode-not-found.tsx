'use client';

import {PackageSearch} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';

interface Props {
    barcode: string;
    onCreateProduct: () => void;
    onSearchManually: () => void;
    onScanAgain: () => void;
}

export function BarcodeNotFound({barcode, onCreateProduct, onSearchManually, onScanAgain}: Props) {
    return (
        <Card className="border-warning/40 bg-warning/5">
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                <PackageSearch className="h-8 w-8 text-warning"/>
                <div>
                    <p className="font-medium">Barcode not found</p>
                    <p className="tabular text-sm text-muted-foreground">{barcode}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                    <Button size="sm" onClick={onCreateProduct}>
                        Add product
                    </Button>
                    <Button variant="outline" size="sm" onClick={onSearchManually}>
                        Search manually
                    </Button>
                    <Button variant="outline" size="sm" onClick={onScanAgain}>
                        Scan again
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}