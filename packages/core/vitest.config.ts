import { defineConfig } from "vitest/config";
import { baseVitestConfig } from "@onwei/config/vitest/base";

// Integration tests share one dev database and switch shared settings (site
// mode, cash on delivery) while they run, so test files run one at a time
// when a database is connected. Without one they only run unit tests.
export default defineConfig({
  test: {
    ...baseVitestConfig.test,
    fileParallelism: !process.env.DATABASE_URL,
  },
});
