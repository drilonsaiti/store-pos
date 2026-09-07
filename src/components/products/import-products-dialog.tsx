'use client';

import {useRef, useState} from 'react';
import {AlertTriangle, FileText, Upload} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {parseProductsCsv, type ParseProductsCsvResult} from '@/lib/utils/csv';
import {useBulkCreateProducts, useProducts} from "@/hooks/use-products";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImportProductsDialog({open, onOpenChange}: Props) {
    const [fileName, setFileName] = useState<string | null>(null);
    const [result, setResult] = useState<ParseProductsCsvResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bulkCreate = useBulkCreateProducts();
    const {data: existingProducts} = useProducts();

    const reset = () => {
        setFileName(null);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFile = async (file: File) => {
        setFileName(file.name);
        const text = await file.text();
        const existingBarcodes = new Set((existingProducts ?? []).map((p) => p.barCode));
        setResult(parseProductsCsv(text, existingBarcodes));
    };
    const handleImport = async () => {
        if (!result || result.rows.length === 0) return;
        await bulkCreate.mutateAsync(result.rows.map((r) => r.data));
        reset();
        onOpenChange(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) reset();
                onOpenChange(next);
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import products</DialogTitle>
                    <DialogDescription>
                        CSV with columns: <code className="tabular">name, barCode, price, purchasePrice, quantity</code>
                    </DialogDescription>
                </DialogHeader>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                    }}
                />

                {!fileName && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center hover:bg-secondary/50"
                    >
                        <Upload className="h-6 w-6 text-muted-foreground"/>
                        <span className="text-sm font-medium">Choose a CSV file</span>
                    </button>
                )}

                {fileName && result && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground"/>
                            <span className="truncate">{fileName}</span>
                        </div>

                        <div className="rounded-md bg-secondary px-3 py-2 text-sm">
                            <span className="font-medium text-success">{result.rows.length} valid</span>
                            {result.errors.length > 0 && (
                                <span
                                    className="ml-2 font-medium text-destructive">{result.errors.length} skipped</span>
                            )}
                        </div>

                        {result.errors.length > 0 && (
                            <div
                                className="max-h-32 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-2">
                                {result.errors.map((err, i) => (
                                    <div key={i} className="flex items-start gap-1.5 py-0.5 text-xs text-destructive">
                                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0"/>
                                        <span>
                      Row {err.row}: {err.message}
                    </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            Choose a different file
                        </Button>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!result || result.rows.length === 0 || bulkCreate.isPending}
                    >
                        {bulkCreate.isPending ? 'Importing…' : `Import ${result?.rows.length ?? 0} product${result?.rows.length === 1 ? '' : 's'}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}