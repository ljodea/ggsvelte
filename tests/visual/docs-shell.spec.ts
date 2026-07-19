import { expect, test } from "@playwright/test";

const GUIDE_ROUTE = "/guide/getting-started";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
}

for (const width of [375, 768, 1280]) {
  test(`docs shell has no horizontal overflow at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(GUIDE_ROUTE);
    await expectNoHorizontalOverflow(page);
  });
}

for (const route of ["/examples/point/scatter-color", "/reference/interactions", "/playground"]) {
  test(`${route} keeps wide content locally contained on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(route);
    await expectNoHorizontalOverflow(page);
  });
}

test("desktop docs shell exposes chapter, breadcrumb, contents, and sequence navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(GUIDE_ROUTE);

  const chapters = page.getByRole("navigation", { name: "Guide chapters" });
  await expect(chapters).toBeVisible();
  await expect(chapters.getByRole("link")).toHaveCount(9);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
    "Getting started",
  );
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Previous and next chapters" })).toBeVisible();
});

test("mobile header and docs navigation are explicit, reachable controls", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto(GUIDE_ROUTE);

  const siteMenu = page.getByRole("button", { name: "Open site menu" });
  await expect(siteMenu).toBeVisible();
  await siteMenu.click();
  const siteDialog = page.getByRole("dialog");
  await expect(siteDialog.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(siteDialog.getByRole("link", { name: "Gallery", exact: true })).toBeVisible();
  await expect(siteDialog.getByRole("button", { name: "Close site menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(siteMenu).toBeFocused();

  const chapterMenu = page.getByRole("button", { name: "Open guide chapters" });
  await expect(chapterMenu).toBeVisible();
  await expect(page.getByRole("link", { name: "Skip to docs navigation" })).toHaveAttribute(
    "href",
    "#guide-chapters-trigger",
  );
  await chapterMenu.click();
  const chapterDialog = page.locator("dialog.chapter-dialog");
  await expect(chapterDialog.getByRole("navigation", { name: "Guide chapters" })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 760 });
  await expect(chapterDialog).toBeVisible();
  await chapterDialog.getByRole("button", { name: "Close guide chapters" }).click();
  await expectNoHorizontalOverflow(page);
});

test("code tabs implement automatic arrow, Home, and End activation with roving tabindex", async ({
  page,
}) => {
  await page.goto("/examples/point/scatter-color");
  const tabs = page.getByRole("tablist", { name: "Code representations" }).getByRole("tab");

  await expect(tabs.first()).toHaveAttribute("tabindex", "0");
  await expect(tabs.nth(1)).toHaveAttribute("tabindex", "-1");
  await tabs.first().focus();
  await tabs.first().press("End");
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
  await tabs.last().press("Home");
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await tabs.first().press("ArrowLeft");
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
});

test("appearance choice applies immediately and survives navigation", async ({ page }) => {
  await page.goto("/guide/getting-started?theme=light");
  await page.getByRole("button", { name: "Dark appearance", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/guide/interactions");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Light appearance", exact: true })).toBeVisible();
});

test("appearance control remains usable when browser storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Storage denied", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage denied", "SecurityError");
    };
  });
  await page.goto("/guide/getting-started?theme=light");
  await page.getByRole("button", { name: "Dark appearance", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("route metadata is canonical, singular, and aliases are noindex", async ({ page }) => {
  await page.goto(GUIDE_ROUTE);
  await expect(page).toHaveTitle("Getting started — ggsvelte");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  const mode = await page.locator("#main-content").getAttribute("data-build-mode");
  const canonicalBase =
    mode === "legacy-full" ? "https://ljodea.github.io/ggsvelte" : "https://ggsvelte.sh";
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${canonicalBase}/guide/getting-started`,
  );
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);

  await page.goto("/examples/interactions/inspection");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${canonicalBase}/examples/interaction/tooltip`,
  );

  const response = await page.goto("/route-that-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("guide shell visual contract: desktop light, dark, and forced colors", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${GUIDE_ROUTE}?theme=light`);
  await expect(page).toHaveScreenshot("docs-guide-1280-light.png");

  await page.goto(`${GUIDE_ROUTE}?theme=dark`);
  await expect(page).toHaveScreenshot("docs-guide-1280-dark.png");

  await page.emulateMedia({ forcedColors: "active" });
  await expect(page).toHaveScreenshot("docs-guide-1280-forced-colors.png");
});

test("guide shell visual contract: mobile light", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto(`${GUIDE_ROUTE}?theme=light`);
  await expect(page).toHaveScreenshot("docs-guide-375-light.png");
});
