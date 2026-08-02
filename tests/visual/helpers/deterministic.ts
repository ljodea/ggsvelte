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
  // `?vr` already starts the import at module init — do not click load buttons
  // there (they race the upgrade and can hang Playwright's actionability checks).
  const hasVr = await page.evaluate(() => new URL(location.href).searchParams.has("vr"));
  if (!hasVr) {
    // Drain by count: click the current first match, then wait until the
    // "Load interactive chart" count drops (label → Loading… or unmount).
    // Indexed nth after a frozen count races removals; .first()+detached
    // re-resolves to the next button and can stop early.
    for (;;) {
      const buttons = page.getByRole("button", { name: "Load interactive chart" });
      const n = await buttons.count();
      if (n === 0) break;
      const first = buttons.nth(0);
      if (!(await first.isVisible().catch(() => false))) break;
      await first.click({ timeout: 5_000 }).catch(() => {
        /* may unmount mid-upgrade */
      });
      try {
        await expect(buttons).toHaveCount(n - 1, { timeout: 15_000 });
      } catch {
        break;
      }
    }
  }
  // 30s: cold-import of the chart stack after a PNG placeholder. First smoke
  // case after a fresh worker is the slow path; later cases stay well under.
  await expect(page.locator('.gg-plot-root[data-gg-ready="true"]')).toHaveCount(expectedPlots, {
    timeout: 30_000,
  });
}
