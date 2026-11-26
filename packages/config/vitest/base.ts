import type { TestUserConfig } from "vitest/config";

// Integration tests are gated on DATABASE_URL and write to the real database.
// Vercel builds have it set (shared with production), so ignore it there:
// slow, flaky, and they touch live data. They still run locally.
if (process.env.VERCEL) {
  delete process.env.DATABASE_URL;
}

// The dev database is far from a laptop (about 0.4s a query), which expires
// Prisma's default 5s transactions mid-test. Tests only; see
// packages/database/src/client.ts.
process.env.PRISMA_TRANSACTION_TIMEOUT_MS ??= "30000";

export const baseVitestConfig: { test: TestUserConfig } = {
  test: {
    passWithNoTests: false,
    restoreMocks: true,
    // The dev DB is about 0.4s per query from a laptop, so a test that reads
    // real data needs far more than vitest's 5s default. Unit runs (no
    // database) keep the default so a hung test still fails fast.
    testTimeout: process.env.DATABASE_URL ? 60000 : 5000,
  },
};
