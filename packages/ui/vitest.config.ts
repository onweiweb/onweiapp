import { defineConfig } from "vitest/config";
import { baseVitestConfig } from "@onwei/config/vitest/base";

export default defineConfig({
  test: {
    ...baseVitestConfig.test,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
