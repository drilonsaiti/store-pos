import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    type User,
} from 'firebase/auth';
import {type FirebaseOptions, getApp, getApps, initializeApp} from 'firebase/app';

function requireEnv(name: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function getFirebaseConfig(): FirebaseOptions {
    return {
        apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
        authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
        databaseURL: requireEnv('NEXT_PUBLIC_FIREBASE_DATABASE_URL', process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL),
        projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
        storageBucket: requireEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
        messagingSenderId: requireEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
        appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    };
}

function getFirebaseApp() {
    return getApps().length ? getApp() : initializeApp(getFirebaseConfig());
}

export function getFirebaseAuth() {
    return getAuth(getFirebaseApp());
}

export type {User};

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
    return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return credential.user;
}

export async function signUp(email: string, password: string) {
    if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== 'true') {
        throw new Error('Sign-up is currently disabled.');
    }
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    return credential.user;
}

export async function signOutUser() {
    await signOut(getFirebaseAuth());
}