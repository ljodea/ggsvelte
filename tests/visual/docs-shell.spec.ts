import { expect, test } from "@playwright/test";

const GUIDE_ROUTE = "/guide/getting-started";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
}

for (const width of [375, 768, 1024, 1280, 1600]) {
  test(`docs shell has no horizontal overflow at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(GUIDE_ROUTE);
    await expectNoHorizontalOverflow(page);
  });
}

for (const route of [
  "/examples/point/scatter-color",
  "/reference/interactions",
  "/playground",
  "/guide/errors#unknown-field",
]) {
  test(`${route} keeps wide content locally contained on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(route);
    await expectNoHorizontalOverflow(page);
  });
}

test("getting started presents one complete Svelte file before secondary surfaces", async ({
  page,
}) => {
  await page.goto(GUIDE_ROUTE);
  const article = page.locator("article.guide");
  await expect(article).toContainText("src/routes/+page.svelte (complete file)");
  const text = await article.textContent();
  expect(text?.indexOf("Draw your first chart")).toBeLessThan(
    text?.indexOf("You have a chart") ?? 0,
  );
  expect(text?.indexOf("You have a chart")).toBeLessThan(text?.indexOf("Fluent builder") ?? 0);
  const firstFile = article.locator(".lesson-source--file code");
  await expect(firstFile).toContainText("import { GeomPoint, GGPlot }");
  await expect(firstFile).toContainText("ariaLabel=");
  await expect(firstFile).not.toContainText("width=");
  await expect(firstFile).not.toContainText("height=");
  await expect(
    article.locator(".copy-code code").filter({ hasText: "import { aes, gg }" }),
  ).toBeVisible();
  await expect(
    article.locator(".copy-code code").filter({ hasText: '"geom": "point"' }),
  ).toBeVisible();
});

test("errors deep links expose source-qualified recovery and copy safe recipes", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/guide/errors#unknown-field");
  await expect(page.locator("#unknown-field")).toBeVisible();
  await expect(page.locator("#unknown-field-pipeline")).toHaveCount(1);
  const recipe = page.locator("#unknown-field ~ .guide-code-copy").first();
  await recipe.getByRole("button", { name: "Copy code" }).click();
  await expect(recipe.getByRole("status")).toHaveText("Copied.");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('"field": "weight"');

  await page.goto("/guide/errors#interaction-tool-unavailable");
  await expect(page.locator("#interaction-tool-unavailable")).toBeVisible();
  await expect(page.locator("#interaction-tool-unavailable + p")).toContainText(
    "INTERACTION_TOOL_UNAVAILABLE",
  );

  await page.goto("/guide/errors#invalid-json");
  await expect(page.locator("#invalid-json")).toBeVisible();
  await expect(page.locator("#invalid-json ~ .guide-code-copy").first()).toContainText(
    "ggsvelte-render",
  );
});

test("guide code copy falls back to selecting text when clipboard access is denied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) },
    });
  });
  await page.goto("/guide/errors#unknown-field");
  const recipe = page.locator("#unknown-field ~ .guide-code-copy").first();
  await recipe.getByRole("button", { name: "Copy code" }).click();
  await expect(recipe.getByRole("status")).toHaveText(
    "Clipboard unavailable. Code selected for manual copy.",
  );
  expect(await page.evaluate(() => window.getSelection()?.toString())).toContain(
    '"field": "weight"',
  );
});

test("desktop docs shell exposes chapter, breadcrumb, contents, and sequence navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(GUIDE_ROUTE);

  const chapters = page.getByRole("navigation", { name: "Guide chapters" });
  await expect(chapters).toBeVisible();
  await expect(chapters.getByRole("link")).toHaveCount(26);
  await expect(chapters.getByRole("link", { name: "Dates without preprocessing" })).toBeVisible();
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
  await page.setViewportSize({ width: 1280, height: 900 });
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
  await page.setViewportSize({ width: 1280, height: 900 });
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

test("public metadata exposes social cards and truthful route-local structured data", async ({
  page,
}) => {
  await page.goto("/");
  const mode = await page.locator("#main-content").getAttribute("data-build-mode");
  const canonicalBase =
    mode === "legacy-full" ? "https://ljodea.github.io/ggsvelte" : "https://ggsvelte.sh";
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    `${canonicalBase}/`,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    `${canonicalBase}/previews/interaction-tooltip-light.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  const homeData = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "[]",
  ) as Array<{ "@type": string }>;
  expect(homeData.map((entry) => entry["@type"])).toEqual(["WebSite", "SoftwareSourceCode"]);

  await page.goto(GUIDE_ROUTE);
  const guideData = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "[]",
  ) as Array<{ "@type": string; itemListElement?: Array<{ name: string }> }>;
  expect(guideData).toMatchObject([
    {
      "@type": "BreadcrumbList",
      itemListElement: [{ name: "Docs" }, { name: "Getting started" }],
    },
  ]);

  await page.goto("/examples");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});
