// Docs app component tests: vitest 4 browser mode + Playwright chromium.
// Same harness pattern as packages/svelte (issue #991).
import path from "node:path";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [svelte()],
  // One svelte runtime only: without these, vite prebundles the svelte
  // runtime for the component imports while @testing-library/svelte-core
  // loads the source copy -> two runtimes -> effect_orphan errors.
  resolve: {
    alias: {
      $lib: path.join(root, "src/lib"),
      "$app/paths": path.join(root, "tests/mocks/app-paths.ts"),
    },
    dedupe: ["svelte"],
  },
  optimizeDeps: { exclude: ["svelte", "@testing-library/svelte-core"] },
  test: {
    include: ["tests/**/*.test.ts"],
    retry: process.env.CI === "true" ? 1 : 0,
    maxWorkers: process.env.CI === "true" ? 2 : undefined,
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      screenshotFailures: true,
      screenshotDirectory: "test-results/screenshots",
      trace: {
        mode: "on-first-retry",
        tracesDir: "test-results/traces",
        screenshots: true,
        snapshots: false,
      },
      instances: [{ browser: "chromium" }],
    },
  },
});
