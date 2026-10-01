import { defineConfig } from "@playwright/test";

// Responsive harness only. Reuses a running dev server on :3000 if present.
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  timeout: 120_000,
  workers: 2,
  use: {
    baseURL: "http://localhost:3000",
    // Installed browser is build 1228; override with PW_CHROMIUM after `npx playwright install`.
    launchOptions: {
      executablePath:
        process.env.PW_CHROMIUM ??
        `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
    },
  },
  webServer: {
    command: "npm run dev --workspace=@onwei/web",
    url: "http://localhost:3000/ontheway",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
