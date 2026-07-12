/**
 * VR matrix: every manifest example × [light, dark] (plan: "golden corpus
 * first — ~2 examples per geom × light/dark"). Generated from
 * examples/manifest.ts — adding an example to the corpus grows this matrix
 * with no test edits ("one source, three uses").
 *
 * Waits before every shot:
 * 1. html[data-theme] confirms the pre-paint theme script ran with our value
 * 2. document.fonts.ready (system-font stack resolves immediately; keeps the
 *    contract explicit for when a self-hosted font lands — decision 0009)
 * 3. [data-gg-ready="true"] — <GGPlot> flips it after hydration's first
 *    committed render flush
 */
import { expect, test } from "@playwright/test";

import { EXAMPLES } from "../../examples/manifest";

const THEMES = ["light", "dark"] as const;

for (const example of EXAMPLES) {
  for (const theme of THEMES) {
    test(`${example.id} — ${theme}`, async ({ page }) => {
      await page.goto(`/examples/${example.id}?vr&theme=${theme}`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await expect(page.locator('.gg-plot-root[data-gg-ready="true"]')).toHaveCount(1);
      await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
        `${example.category}-${example.name}-${theme}.png`,
      );
    });
  }
}
