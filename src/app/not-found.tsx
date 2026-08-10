import Link from 'next/link';
import {PackageSearch} from 'lucide-react';
import {Button} from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <PackageSearch className="h-6 w-6 text-muted-foreground"/>
            </div>
            <div>
                <p className="font-medium">Page not found</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    That page doesn&apos;t exist or may have moved.
                </p>
            </div>
            <Button asChild>
                <Link href="/">Go to dashboard</Link>
            </Button>
        </div>
    );
}