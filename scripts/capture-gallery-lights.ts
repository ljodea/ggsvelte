/**
 * Capture idle ?vr light gallery lights into apps/docs/static/previews/.
 * Intended to run inside the pinned Playwright container against a built docs
 * site (see package.json / CONTRIBUTING).
 *
 * Usage (after bun run build && bun run build:docs):
 *   bun scripts/serve-docs.ts &
 *   bun scripts/capture-gallery-lights.ts              # every example
 *   bun scripts/capture-gallery-lights.ts interaction/ # id-prefix subset
 *   bun run gallery:previews:gen
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { EXAMPLES } from "../examples/manifest.js";
import { canonicalPreviewFilename } from "./gen-gallery-previews.js";

const ROOT = resolve(import.meta.dir, "..");
const OUT = join(ROOT, "apps", "docs", "static", "previews");
const BASE = process.env["GALLERY_CAPTURE_BASE"] ?? "http://127.0.0.1:4173";

const prefix = process.argv[2];
const targets =
  prefix === undefined ? EXAMPLES : EXAMPLES.filter((entry) => entry.id.startsWith(prefix));

/**
 * Wait for every plot on the page, not a per-example count. The docs site
 * prerenders each <GGPlot> server-side, so all `.gg-plot-root` elements are in
 * the served HTML before hydration — the roots can be counted from the DOM
 * instead of restating "legend-focus has three plots" in a table that goes
 * stale the moment an example gains or loses a chart.
 */
async function settle(page: Page): Promise<void> {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.evaluate(async () => {
    document.documentElement.dataset.visualTest = "";
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolveFrame();
        });
      });
    });
  });
  const roots = await page.locator(".gg-plot-root").count();
  if (roots === 0) throw new Error("expected at least one plot root in the served HTML");
  await page.waitForFunction(
    (expected) =>
      document.querySelectorAll('.gg-plot-root[data-gg-ready="true"]').length === expected,
    roots,
  );
}

async function main(): Promise<void> {
  if (targets.length === 0) {
    throw new Error(`no examples match the id prefix "${String(prefix)}"`);
  }
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const entry of targets) {
      const width = entry.vrWidth ?? 640;
      const height = entry.vrHeight ?? 400;
      const context = await browser.newContext({
        viewport: { width: Math.max(width + 40, 800), height: Math.max(height + 40, 640) },
        deviceScaleFactor: 1,
        colorScheme: "light",
        reducedMotion: "reduce",
        locale: "en-US",
        timezoneId: "UTC",
      });
      const page = await context.newPage();
      // The 10k-mark canvas specimen hydrates a large client bundle and paints
      // on the main thread, so networkidle alone can outlast Playwright's 30s
      // default (vr.spec.ts grants that scenario 120s for the same reason).
      // Budget generously for every page: readiness is gated by settle(), not
      // by the clock, so a slow example waits instead of shipping a half-drawn
      // preview — and a genuinely hung one still fails rather than hanging.
      page.setDefaultNavigationTimeout(120_000);
      page.setDefaultTimeout(120_000);
      const url = `${BASE}/examples/${entry.id}?vr&theme=light`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.locator("html").getAttribute("data-vr");
      await settle(page);
      const frame = page.locator(".gg-example-frame");
      await frame.waitFor({ state: "visible" });
      const filename = canonicalPreviewFilename(entry.id);
      await frame.screenshot({
        path: join(OUT, filename),
        animations: "disabled",
        caret: "hide",
      });
      console.log(`wrote ${filename}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

await main();
