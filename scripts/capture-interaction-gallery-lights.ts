/**
 * Capture idle ?vr light gallery lights for interaction examples into
 * apps/docs/static/previews/. Intended to run inside the pinned Playwright
 * container against a built docs site (see package.json / CONTRIBUTING).
 *
 * Usage (after bun run build && bun run build:docs):
 *   bun scripts/serve-docs.ts &
 *   bun scripts/capture-interaction-gallery-lights.ts
 *   bun run gallery:previews:gen
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { EXAMPLES } from "../examples/manifest.js";

const ROOT = resolve(import.meta.dir, "..");
const OUT = join(ROOT, "apps", "docs", "static", "previews");
const BASE = process.env["GALLERY_CAPTURE_BASE"] ?? "http://127.0.0.1:4173";

const INTERACTION = EXAMPLES.filter((entry) => entry.id.startsWith("interaction/"));

async function settle(page: Page, expectedPlots: number): Promise<void> {
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
  await page.locator('.gg-plot-root[data-gg-ready="true"]').first().waitFor();
  const count = await page.locator('.gg-plot-root[data-gg-ready="true"]').count();
  if (count < expectedPlots) {
    await page
      .locator('.gg-plot-root[data-gg-ready="true"]')
      .nth(expectedPlots - 1)
      .waitFor();
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const entry of INTERACTION) {
      const width = entry.vrWidth ?? 640;
      const height = entry.vrHeight ?? 400;
      const plots =
        entry.id === "interaction/legend-focus"
          ? 3
          : entry.id === "interaction/linked-views"
            ? 2
            : 1;
      const context = await browser.newContext({
        viewport: { width: Math.max(width + 40, 800), height: Math.max(height + 40, 640) },
        deviceScaleFactor: 1,
        colorScheme: "light",
        reducedMotion: "reduce",
        locale: "en-US",
        timezoneId: "UTC",
      });
      const page = await context.newPage();
      const url = `${BASE}/examples/${entry.id}?vr&theme=light`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.locator("html").getAttribute("data-vr");
      await settle(page, plots);
      const frame = page.locator(".gg-example-frame");
      await frame.waitFor({ state: "visible" });
      const filename = `${entry.id.replaceAll("/", "-")}-light.png`;
      const path = join(OUT, filename);
      await frame.screenshot({ path, animations: "disabled", caret: "hide" });
      console.log(`wrote ${filename} (${String(width)}x${String(height)}, ${String(plots)} plots)`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

await main();
