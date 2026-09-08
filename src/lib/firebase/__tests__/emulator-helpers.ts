import {
    type RulesTestEnvironment,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ref, set, type Database} from 'firebase/database';

export {assertFails, assertSucceeds} from '@firebase/rules-unit-testing';

const DATABASE_EMULATOR_PORT = 9000;
const PROJECT_ID = 'store-pos-emulator-test';

let env: RulesTestEnvironment | null = null;

export async function getTestEnv(): Promise<RulesTestEnvironment> {
    if (!env) {
        env = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            database: {
                rules: readFileSync(resolve(process.cwd(), 'database.rules.json'), 'utf8'),
                host: '127.0.0.1',
                port: DATABASE_EMULATOR_PORT,
            },
        });
    }
    return env;
}

export async function teardownTestEnv(): Promise<void> {
    if (env) {
        await env.cleanup();
        env = null;
    }
}

export async function clearData(): Promise<void> {
    const testEnv = await getTestEnv();
    await testEnv.clearDatabase();
}

/**
 * `@firebase/rules-unit-testing`'s TypeScript types declare `.database()` as
 * returning the legacy `firebase.database.Database` (compat namespace,
 * from `firebase/compat/database`) — but the object it actually returns at
 * runtime is a genuine modular `Database` instance; the package's own doc
 * comment confirms it works with "v9 modular or v9 compat" APIs
 * interchangeably. This one cast bridges that type-only mismatch at a
 * single choke point, so every test file can just use the normal modular
 * ref()/get()/update()/increment()/runTransaction() functions from
 * 'firebase/database' as usual, instead of fighting this everywhere.
 */
function asModularDb(compatTypedDb: unknown): Database {
    return compatTypedDb as Database;
}

/** A database instance authenticated as `uid`, with `uid` already added to
 * the staff allowlist — the common case for "a logged-in cashier". */
export async function staffDb(uid = 'staff-1'): Promise<Database> {
    const testEnv = await getTestEnv();
    await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(asModularDb(context.database()), `staff/${uid}`), true);
    });
    return asModularDb(testEnv.authenticatedContext(uid).database());
}

/** A database instance authenticated, but deliberately NOT on the staff
 * allowlist — for asserting the allowlist itself is enforced. */
export async function nonStaffDb(uid = 'intruder'): Promise<Database> {
    const testEnv = await getTestEnv();
    return asModularDb(testEnv.authenticatedContext(uid).database());
}

/** A database instance with no auth at all. */
export async function anonDb(): Promise<Database> {
    const testEnv = await getTestEnv();
    return asModularDb(testEnv.unauthenticatedContext().database());
}

/** Writes directly, bypassing rules — for seeding fixture data that isn't
 * itself the thing under test. */
export async function seed(writer: (db: Database) => Promise<void>): Promise<void> {
    const testEnv = await getTestEnv();
    await testEnv.withSecurityRulesDisabled(async (context) => {
        await writer(asModularDb(context.database()));
    });
}