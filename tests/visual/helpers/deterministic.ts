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
  // Example / lesson charts are intent-gated (hover or "Load interactive").
  // Trigger intent so VR smoke cases still get a live plot without near-viewport
  // auto-upgrade pulling the chart stack on every fold approach.
  const loadButtons = page.getByRole("button", { name: "Load interactive chart" });
  const n = await loadButtons.count();
  for (let i = 0; i < n; i += 1) {
    await loadButtons.nth(i).click();
  }
  // 30s: cold-import of the chart stack after a PNG placeholder. First smoke
  // case after a fresh worker is the slow path; later cases stay well under.
  await expect(page.locator('.gg-plot-root[data-gg-ready="true"]')).toHaveCount(expectedPlots, {
    timeout: 30_000,
  });
}
