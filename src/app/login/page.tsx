'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanBarcode, LoaderCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { signIn, signUp } from '@/lib/firebase/auth/auth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function LoginPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && user) router.replace('/');
    }, [authLoading, user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (mode === 'sign-in') {
                await signIn(email, password);
            } else {
                await signUp(email, password);
            }
            router.replace('/');
        } catch (error) {
            const code = (error as { code?: string })?.code ?? '';
            const message =
                code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
                    ? 'Incorrect email or password.'
                    : code === 'auth/email-already-in-use'
                        ? 'An account with this email already exists.'
                        : code === 'auth/weak-password'
                            ? 'Password must be at least 6 characters.'
                            : 'Could not sign in. Check your connection and try again.';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-dvh items-center justify-center bg-secondary/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="items-center text-center">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <ScanBarcode className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base text-foreground">
                        {mode === 'sign-in' ? 'Sign in to Store Console' : 'Create your account'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" size="lg" disabled={submitting}>
                            {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
                        </Button>
                    </form>
                    <button
                        type="button"
                        onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
                        className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
                    >
                        {mode === 'sign-in' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}