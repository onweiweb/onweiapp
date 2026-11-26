import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { baseVitestConfig } from "@onwei/config/vitest/base";

export default defineConfig({
  // The Next.js tsconfig sets jsx: "preserve" for Next's own SWC build step,
  // which leaves JSX untransformed for Vitest's own transform pipeline.
  // @vitejs/plugin-react compiles it regardless of that tsconfig setting.
  plugins: [react()],
  test: {
    ...baseVitestConfig.test,
    // DB tests share one dev database and its site settings: run files one at
    // a time when a database is connected (same as packages/core).
    fileParallelism: !process.env.DATABASE_URL,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
