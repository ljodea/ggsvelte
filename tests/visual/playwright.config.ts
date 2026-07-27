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
 * - reduced motion pinned through contextOptions (see vrContextOptions)
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
import { type BrowserContextOptions, defineConfig } from "@playwright/test";

const snapshotDir = process.env["VR_SNAPSHOT_DIR"] ?? "__screenshots__";

/**
 * Project-wide browser-context media state (issue #718).
 *
 * `forcedColors`, `reducedMotion` and `contrast` exist on BrowserContextOptions
 * but NOT on Playwright's TestOptions (checked in 1.61.1, the pinned version,
 * and still absent in 1.62), so `contextOptions` is the only way to set them
 * from a config — and `test.use({ forcedColors: "active" })` is dropped by the
 * runner without an error. `colorScheme` IS a test option and composes fine:
 * the real fixtures are spread over `contextOptions`, not replaced by it.
 *
 * Two supported ways to change media state for one test:
 * - `page.emulateMedia({ forcedColors: "active" })` — what this suite uses,
 *   composes with everything below;
 * - `test.use({ contextOptions: { ...vrContextOptions, forcedColors: "active" } })`
 *   — `contextOptions` REPLACES rather than merges, so the spread is what
 *   keeps reduced motion on; a bare object silently drops it.
 *
 * tests/visual/media-emulation.spec.ts pins all of the above.
 */
export const vrContextOptions: BrowserContextOptions = { reducedMotion: "reduce" };

/** Specs that the component-journeys CI job runs (#944). */
const JOURNEYS_SPECS =
  /(?:docs-shell|docs-home-gallery|docs-progressive-search|docs-themes|interaction-accessibility|playground)\.spec\.ts$/;

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
    contextOptions: vrContextOptions,
    locale: "en-US",
    timezoneId: "UTC",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // VR / visual-contract seats keep Playwright's default 30s budget.
    { name: "chromium", use: { browserName: "chromium" }, testIgnore: JOURNEYS_SPECS },
    // Docs a11y/structure journeys: cold CI hydrate straddled 30s (~30.2s
    // observed; mobile dialog + resize worse). 60s is the former per-test
    // mitigation, applied at project scope so local runs match CI (#944).
    {
      name: "journeys",
      use: { browserName: "chromium" },
      testMatch: JOURNEYS_SPECS,
      timeout: 60_000,
    },
  ],
  webServer: {
    command: "bun ../../scripts/serve-docs.ts",
    port: 4173,
    reuseExistingServer: process.env["CI"] === undefined,
  },
});
