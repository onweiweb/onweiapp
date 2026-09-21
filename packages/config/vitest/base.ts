import type { TestUserConfig } from "vitest/config";

export const baseVitestConfig: { test: TestUserConfig } = {
  test: {
    passWithNoTests: false,
    restoreMocks: true,
  },
};
