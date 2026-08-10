import {type FirebaseApp, getApp, getApps, initializeApp} from 'firebase/app';
import {type Database, getDatabase} from 'firebase/database';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
    return getApps().length ? getApp() : initializeApp(firebaseConfig);
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
