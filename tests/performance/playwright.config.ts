import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  outputDir: "./test-results",
  fullyParallel: false,
  retries: 0,
  forbidOnly: process.env["CI"] !== undefined,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    deviceScaleFactor: 1,
    viewport: { width: 800, height: 640 },
    locale: "en-US",
    timezoneId: "UTC",
  },
  webServer: {
    command: "bun ../../scripts/serve-docs.ts",
    port: 4173,
    reuseExistingServer: process.env["CI"] === undefined,
  },
});
