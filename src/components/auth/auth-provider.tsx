'use client';

import * as React from 'react';
import {subscribeToAuthChanges, type User} from "@/lib/firebase/auth/auth";

interface AuthState {
    user: User | null;
    loading: boolean;
}

const AuthContext = React.createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = React.useState<AuthState>({ user: null, loading: true });

    React.useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((user) => setState({ user, loading: false }));
        return unsubscribe;
    }, []);

    return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return React.useContext(AuthContext);
}