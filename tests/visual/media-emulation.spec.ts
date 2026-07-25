/*
 * Pins how media emulation actually composes in this project (issue #718).
 *
 * The suite's determinism depends on `prefers-reduced-motion: reduce` being on
 * for every test, and several tests measure real forced-colors behaviour. Both
 * are set through `contextOptions`, whose merge rules are easy to get wrong in
 * a way that fails open: the page just looks normal and the assertions pass
 * for the wrong reason. These tests fail closed instead.
 *
 * Deliberately not screenshots and deliberately not a docs route — every
 * assertion here is about the browser context Playwright hands us, so a data
 * URL keeps the signal free of anything the site could contribute.
 */
import { expect, test } from "@playwright/test";

import { vrContextOptions } from "./playwright.config";

const BLANK = "data:text/html,<title>media emulation</title>";

async function media(page: import("@playwright/test").Page): Promise<{
  reducedMotion: boolean;
  forcedColors: boolean;
  dark: boolean;
}> {
  await page.goto(BLANK);
  return page.evaluate(() => ({
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    forcedColors: matchMedia("(forced-colors: active)").matches,
    dark: matchMedia("(prefers-color-scheme: dark)").matches,
  }));
}

test("reduced motion is active for every test in the project", async ({ page }) => {
  expect(await media(page)).toMatchObject({ reducedMotion: true, forcedColors: false });
});

test.describe("colorScheme is a test option, so test.use composes with the base context", () => {
  test.use({ colorScheme: "dark" });

  test("dark scheme applies and reduced motion survives it", async ({ page }) => {
    expect(await media(page)).toMatchObject({ dark: true, reducedMotion: true });
  });
});

test.describe("forcedColors is NOT a test option, so test.use is silently dropped", () => {
  // Canary. `forcedColors`, `reducedMotion` and `contrast` exist on
  // BrowserContextOptions but not on Playwright's TestOptions (1.61.1 — also
  // absent in 1.62), so the runner ignores this key without an error. When
  // this test starts failing, Playwright has grown the fixture: switch the
  // `page.emulateMedia` calls in docs-*.spec.ts and vr.spec.ts over to
  // `test.use` and delete this block.
  // @ts-expect-error forcedColors is not a Playwright test option
  test.use({ forcedColors: "active" });

  test("test.use({ forcedColors }) does not reach the browser", async ({ page }) => {
    expect(await media(page)).toMatchObject({ forcedColors: false, reducedMotion: true });
  });
});

test.describe("contextOptions replaces rather than merges", () => {
  // Spreading `vrContextOptions` is what keeps reduced motion; a bare
  // `{ forcedColors: "active" }` here would silently drop it.
  test.use({ contextOptions: { ...vrContextOptions, forcedColors: "active" } });

  test("spreading the project base keeps reduced motion alongside forced colors", async ({
    page,
  }) => {
    expect(await media(page)).toMatchObject({ forcedColors: true, reducedMotion: true });
  });
});

test("page.emulateMedia is the per-test form the suite uses, and it composes", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  expect(await media(page)).toMatchObject({ forcedColors: true, reducedMotion: true });
});
