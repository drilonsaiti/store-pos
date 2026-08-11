import {type FirebaseApp, type FirebaseOptions, getApp, getApps, initializeApp} from 'firebase/app';
import {type Database, getDatabase} from 'firebase/database';

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

function getFirebaseApp(): FirebaseApp {
    return getApps().length ? getApp() : initializeApp(getFirebaseConfig());
}

let dbInstance: Database | null = null;

/** Lazily initialized singleton — never call this at module scope in a Server Component. */
export function getDb(): Database {
    if (!dbInstance) {
        dbInstance = getDatabase(getFirebaseApp());
    }
    return dbInstance;
}

export class FirebaseUnavailableError extends Error {
    constructor(cause?: unknown) {
        super('Could not reach the database. Check your connection and try again.');
        this.name = 'FirebaseUnavailableError';
        this.cause = cause;
    }
}