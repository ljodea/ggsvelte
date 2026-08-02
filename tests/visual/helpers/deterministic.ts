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
    // Drain by always targeting the current first match. An indexed nth(i)
    // after count() races button removal (index shift / detach hang).
    for (;;) {
      const btn = page.getByRole("button", { name: "Load interactive chart" }).first();
      if (!(await btn.isVisible().catch(() => false))) break;
      await btn.click({ timeout: 5_000 }).catch(() => {
        /* button may unmount mid-upgrade */
      });
      await btn.waitFor({ state: "detached", timeout: 10_000 }).catch(() => {
        /* import may leave a Loading… control; stop if still present */
      });
      if (await btn.isVisible().catch(() => false)) break;
    }
  }
  // 30s: cold-import of the chart stack after a PNG placeholder. First smoke
  // case after a fresh worker is the slow path; later cases stay well under.
  await expect(page.locator('.gg-plot-root[data-gg-ready="true"]')).toHaveCount(expectedPlots, {
    timeout: 30_000,
  });
}
