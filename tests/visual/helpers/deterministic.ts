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
  // 30s: example pages may cold-import the chart stack after a PNG placeholder
  // (ExampleLiveFrame / near-viewport upgrade). First smoke case after a fresh
  // worker is the slow path; cached modules keep later cases well under this.
  await expect(page.locator('.gg-plot-root[data-gg-ready="true"]')).toHaveCount(expectedPlots, {
    timeout: 30_000,
  });
}
