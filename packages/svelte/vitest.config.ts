// Component tests: vitest 4 browser mode, Playwright's three browser engines —
// the same harness pattern as the retired spikes/browser suites. Versions are
// pinned together with the CI Playwright container (asserted in CI).
import { svelte } from "@sveltejs/vite-plugin-svelte";
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
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      screenshotFailures: true,
      screenshotDirectory: "test-results/screenshots",
      trace: {
        mode: "retain-on-failure",
        tracesDir: "test-results/traces",
        screenshots: true,
        snapshots: false,
      },
      instances: [{ browser: "chromium" }, { browser: "firefox" }, { browser: "webkit" }],
    },
  },
});
