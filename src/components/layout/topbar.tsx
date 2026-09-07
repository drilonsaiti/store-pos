'use client';

import {useTheme} from 'next-themes';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {LogOut, Moon, ScanBarcode, Sun, User} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import {useAuth} from '@/components/auth/auth-provider';
import {signOutUser} from '@/lib/firebase/auth/auth';
import {EmployeePicker} from '@/components/settings/employee-picker';
import {clearLocalAppData} from "@/lib/utils/clear-local-data";

export function Topbar({title}: { title: string }) {
    const {theme, setTheme} = useTheme();
    const {user} = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);

    const handleSignOut = async () => {
        await signOutUser();
        clearLocalAppData();
        router.replace('/login');
    };

    return (
        <header
            className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-2 md:hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <ScanBarcode className="h-3.5 w-3.5"/>
                </div>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <div className="flex items-center gap-2">
                <EmployeePicker/>
                <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
                    <Link href="/sale" aria-label="New sale">
                        <ScanBarcode className="h-[18px] w-[18px]"/>
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle theme"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    {mounted && theme === 'dark' ? <Sun className="h-[18px] w-[18px]"/> :
                        <Moon className="h-[18px] w-[18px]"/>}
                </Button>
                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Account menu">
                                <User className="h-[18px] w-[18px]"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
                            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                                <LogOut className="h-4 w-4"/>
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}