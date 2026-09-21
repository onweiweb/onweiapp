import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { baseVitestConfig } from "@onwei/config/vitest/base";

export default defineConfig({
  // The Next.js tsconfig sets jsx: "preserve" for Next's own SWC build step,
  // which leaves JSX untransformed for Vitest's own transform pipeline.
  // @vitejs/plugin-react compiles it regardless of that tsconfig setting.
  plugins: [react()],
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./app/*" path — Next reads tsconfig
    // directly, but Vitest/Vite need their own alias for the same mapping.
    alias: { "@": path.resolve(import.meta.dirname, "./app") },
  },
  test: {
    ...baseVitestConfig.test,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
