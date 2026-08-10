import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    type User,
} from 'firebase/auth';
import {getApp, getApps, initializeApp} from 'firebase/app';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
    return getApps().length ? getApp() : initializeApp(firebaseConfig);
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
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    return credential.user;
}

export async function signOutUser() {
    await signOut(getFirebaseAuth());
}