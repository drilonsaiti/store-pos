import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.emulator.test.ts'],
        testTimeout: 20_000,
        hookTimeout: 20_000,
        // These files all share ONE live Realtime Database emulator
        // instance, not an isolated per-file environment. Vitest's default
        // is to run separate test FILES in parallel workers — fine for
        // pure unit tests, but here it means one file's beforeEach
        // (clearDatabase()) can wipe data another file's test is mid-way
        // through using, and two files can collide on the same literal
        // test value (e.g. both this suite and rules.emulator.test.ts
        // independently used barcode '111'). Force files to run one after
        // another so only one file ever touches the emulator at a time.
        fileParallelism: false,
    },
});