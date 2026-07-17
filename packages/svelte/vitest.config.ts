// Component tests: vitest 4 browser mode, Playwright's three browser engines —
// the same harness pattern as the retired spikes/browser suites. Versions are
// pinned together with the CI Playwright container (asserted in CI).
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { coverageBase } from "./vitest.coverage.js";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { ggplotSsrEndpoint } from "./tests/helpers/ggplot-ssr-endpoint.js";

export default defineConfig({
  plugins: [svelte(), ggplotSsrEndpoint()],
  // One svelte runtime only: without these, vite prebundles the svelte
  // runtime for the component imports while @testing-library/svelte-core
  // loads the source copy -> two runtimes -> effect_orphan errors.
  resolve: { dedupe: ["svelte"] },
  optimizeDeps: { exclude: ["svelte", "@testing-library/svelte-core"] },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.ssr.test.ts"],
    retry: process.env.CI === "true" ? 1 : 0,
    // Opt-in via --coverage. Browser collection runs on Chromium only
    // (v8-over-CDP); invoke with --project chromium so firefox/webkit
    // are not asked to report coverage.
    coverage: {
      ...coverageBase,
      reportsDirectory: "coverage/browser",
      // Browser-only gate: keep thresholds on this config (not coverageBase)
      // so the structurally-low SSR report is not blocked. Values sit ≥5pp
      // under current mature browser totals to ratchet regressions without
      // flake. CI adoption of test:coverage is a follow-up decision.
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
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
      instances: [{ browser: "chromium" }, { browser: "firefox" }, { browser: "webkit" }],
    },
  },
});
