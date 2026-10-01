import type { TestUserConfig } from "vitest/config";

// Integration tests are gated on DATABASE_URL and write to the real database.
// Vercel builds have it set (shared with production), so ignore it there:
// slow, flaky, and they touch live data. They still run locally.
if (process.env.VERCEL) {
  delete process.env.DATABASE_URL;
}

export const baseVitestConfig: { test: TestUserConfig } = {
  test: {
    passWithNoTests: false,
    restoreMocks: true,
  },
};
