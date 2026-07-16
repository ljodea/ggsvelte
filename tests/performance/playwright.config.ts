import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  outputDir: "./test-results",
  fullyParallel: false,
  // One in-process retry under CI absorbs single-sample host noise on the
  // shared self-hosted runners without hiding persistent regressions.
  retries: process.env["CI"] === undefined ? 0 : 1,
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
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bun ../../scripts/serve-docs.ts",
    port: 4173,
    reuseExistingServer: process.env["CI"] === undefined,
  },
});
