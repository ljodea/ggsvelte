/**
 * Visual-regression Playwright project (plan: "Visual regression — flagship
 * CI feature"). Screenshots the BUILT static docs site (served by
 * scripts/serve-docs.ts) — the artifact that deploys is the artifact under
 * test.
 *
 * Determinism levers (all load-bearing):
 * - deviceScaleFactor 1, fixed viewport, animations disabled, caret hidden
 * - retries 0: a flaky screenshot is a bug, not a retry candidate
 * - colorScheme pinned: the page theme comes ONLY from ?theme= (?vr mode
 *   ignores prefers-color-scheme by design)
 * - snapshotPathTemplate WITHOUT any platform suffix: the pinned Playwright
 *   container (mcr.microsoft.com/playwright:v1.61.1-noble) is the ONLY
 *   baseline platform, so platform-suffixed names would be a lie
 * - maxDiffPixels 0: the renderer is byte-deterministic and the container is
 *   pinned; identical input must produce identical pixels
 *
 * Baseline policy: tests/visual/__screenshots__/ holds COMMITTED baselines
 * produced only by CI's pinned container (via the vr-approve artifact flow).
 * Local runs on non-Linux hosts render with different system fonts — to
 * exercise the pipeline locally, generate throwaway baselines into the
 * gitignored .local-baselines/ dir:
 *
 *   VR_SNAPSHOT_DIR=.local-baselines bun run test:visual -- --update-snapshots
 *   VR_SNAPSHOT_DIR=.local-baselines bun run test:visual
 */
import { defineConfig } from "@playwright/test";

const snapshotDir = process.env["VR_SNAPSHOT_DIR"] ?? "__screenshots__";

export default defineConfig({
  testDir: ".",
  outputDir: "./test-results",
  fullyParallel: true,
  retries: 0,
  forbidOnly: process.env["CI"] !== undefined,
  reporter:
    process.env["CI"] === undefined
      ? [["list"]]
      : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  snapshotPathTemplate: `{testDir}/${snapshotDir}/{arg}{ext}`,
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 0,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    deviceScaleFactor: 1,
    viewport: { width: 800, height: 640 },
    colorScheme: "light",
    contextOptions: { reducedMotion: "reduce" },
    locale: "en-US",
    timezoneId: "UTC",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "bun ../../scripts/serve-docs.ts",
    port: 4173,
    reuseExistingServer: process.env["CI"] === undefined,
  },
});
