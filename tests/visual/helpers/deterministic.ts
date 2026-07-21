import { expect, type Page } from "@playwright/test";

/**
 * Drive screenshots to a public, reproducible state. This deliberately does
 * not mutate application stores: interactive cases must use pointer/keyboard
 * input before calling this helper.
 */
export async function settleVisualState(page: Page, expectedPlots = 1): Promise<void> {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.evaluate(async () => {
    document.documentElement.dataset.visualTest = "";
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });
  await expect(page.locator('.gg-plot-root[data-gg-ready="true"]')).toHaveCount(expectedPlots);
}
