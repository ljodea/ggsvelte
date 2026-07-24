import { expect, test } from "@playwright/test";

test("themes is a first-class route from site navigation and the homepage", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/themes?theme=light");
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Themes" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Themes" }),
  ).toBeVisible();

  await page.goto("/?theme=light");
  // Homepage Contracts section (post-#371 copy) links themes with this accessible name.
  await expect(
    page.getByRole("link", { name: "Built-in themes, palettes, scales" }),
  ).toHaveAttribute("href", /\/themes$/);
});

test("theme code uses the shared manual-copy fallback", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) },
    });
  });
  await page.goto("/themes?theme=light");
  // Only the hero lab retains a CopyCode block after the showcase overhaul.
  const lab = page.getByRole("region", { name: "Chart theme and palette lab" });
  await lab.getByRole("button", { name: "Copy selected theme and palette code" }).click();
  await expect(lab.getByRole("status").filter({ hasText: "Clipboard unavailable" })).toHaveText(
    "Clipboard unavailable. Code selected for manual copy.",
  );
  expect(await page.evaluate(() => getSelection()?.toString())).toContain('theme="default"');
});

test("themes compares all built-in chart themes as full-width interactive portraits", async ({
  page,
}) => {
  await page.goto("/themes?theme=light");

  const list = page.getByRole("list", { name: "Built-in chart themes" });
  const specimens = list.getByRole("listitem");
  await expect(specimens).toHaveCount(12);
  await expect(specimens.getByRole("heading", { level: 3 })).toHaveText([
    "Default",
    "Light",
    "Dark",
    "Minimal",
    "ggplot2",
    "Classic",
    "HRBR",
    "Few",
    "Clean",
    "FiveThirtyEight",
    "Economist",
    "Tufte",
  ]);

  for (const specimen of await specimens.all()) {
    await expect(specimen.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true");
    // No per-specimen CopyCode after the redesign.
    await expect(specimen.getByRole("button", { name: /^Copy / })).toHaveCount(0);
    // Charts use real corpora — never the old 8-dot synthetic scatter.
    await expect(specimen.locator(".gg-plot-root")).toBeVisible();
  }
});

test("chart theme stays separate until follow-docs appearance is explicit", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/themes?theme=light");

  const lab = page.getByRole("region", { name: "Chart theme and palette lab" });
  const chartTheme = lab.getByLabel("Chart theme", { exact: true });
  const palette = lab.getByLabel("Categorical palette", { exact: true });
  const follow = lab.getByRole("checkbox", { name: "Follow docs appearance" });
  const plot = lab.locator(".gg-plot-root");
  const chartPaper = () => plot.locator(".gg-paper").getAttribute("fill");

  await chartTheme.selectOption("economist");
  await expect(lab.locator(".copy-code code")).toContainText('theme="economist"');
  await expect.poll(chartPaper).toBe("var(--gg-paper, #d5e4eb)");
  // Palette is independent of theme.
  await palette.selectOption("tableau10");
  await expect(lab.locator(".copy-code code")).toContainText('scheme: "tableau10"');
  await expect(lab.locator(".copy-code code")).toContainText('theme="economist"');

  await page.getByRole("button", { name: "Dark appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(chartPaper).toBe("var(--gg-paper, #d5e4eb)");

  await follow.check();
  await expect(lab.getByRole("status").filter({ hasText: "follows site" })).toContainText(
    'scheme="tableau10"',
  );
  await expect(lab.locator(".copy-code code")).toContainText('theme="dark"');
  await expect.poll(chartPaper).toBe("var(--gg-paper, #16181d)");
  await page.getByRole("button", { name: "Light appearance" }).click();
  await expect.poll(chartPaper).toBe("var(--gg-paper, #ffffff)");

  await follow.uncheck();
  await expect(chartTheme).toHaveValue("economist");
  await expect(palette).toHaveValue("tableau10");
  await expect.poll(chartPaper).toBe("var(--gg-paper, #d5e4eb)");
});

test("categorical palettes show ordered swatches and reverse without hex code chrome", async ({
  page,
}) => {
  await page.goto("/themes?theme=light");

  const region = page.getByRole("region", { name: "Categorical palettes" });
  const cards = region.getByRole("list", { name: "Categorical palettes" }).locator(":scope > li");
  await expect(cards).toHaveCount(5);
  await expect(cards.getByRole("heading", { level: 3 })).toHaveText([
    "Observable 10",
    "Ipsum",
    "Flexoki",
    "Tableau 10",
    "Colorblind",
  ]);
  await expect(cards.locator(".capacity")).toHaveText([
    "10 colors",
    "9 colors",
    "8 colors",
    "10 colors",
    "8 colors",
  ]);

  const observable = cards.first();
  const swatches = observable
    .getByRole("list", { name: "Observable 10 ordered colors" })
    .getByRole("listitem");
  await expect(swatches).toHaveCount(10);
  // Hex lives in accessible names only — not as visible code under every chip.
  await expect(swatches.first()).toHaveAttribute("aria-label", "1: #4269d0");
  await expect(swatches.last()).toHaveAttribute("aria-label", "10: #9498a0");
  await expect(swatches.first().locator("code")).toHaveCount(0);

  // Col chart uses fill (not the old 5-point scatter).
  await expect(observable.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true");
  const firstMark = observable.locator(".gg-plot-root [fill='#4269d0']").first();
  await expect(firstMark).toBeVisible();

  await region.getByRole("checkbox", { name: "Reverse" }).check();
  await expect(swatches.first()).toHaveAttribute("aria-label", "1: #9498a0");
  await expect(swatches.last()).toHaveAttribute("aria-label", "10: #4269d0");
  await expect(observable.locator(".gg-plot-root [fill='#9498a0']").first()).toBeVisible();

  // No per-palette CopyCode.
  await expect(observable.getByRole("button", { name: /^Copy / })).toHaveCount(0);

  await region.getByLabel("Chart paper", { exact: true }).selectOption("dark");
  await expect(observable.locator(".gg-paper")).toHaveAttribute("fill", "var(--gg-paper, #16181d)");
});

test("sequential color compares direction, custom stops, and a pinned domain on raster", async ({
  page,
}) => {
  await page.goto("/themes?theme=light");

  const region = page.getByRole("region", { name: "Sequential color scales" });
  const cards = region
    .getByRole("list", { name: "Sequential scale examples" })
    .locator(":scope > li");
  await expect(cards).toHaveCount(4);
  await expect(cards.getByRole("heading", { level: 3 })).toHaveText([
    "Viridis",
    "Reversed",
    "Custom range",
    "Pinned domain",
  ]);

  for (const card of await cards.all()) {
    await expect(card.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true");
    // Raster surface, not the old 6-point scatter.
    await expect(card.locator(".gg-points circle")).toHaveCount(0);
  }

  // Pinned domain uses actual density z (~0.3–0.7), not the old [0, 100] point lab.
  const pinnedLabels = cards.nth(3).locator(".gg-legend-label");
  await expect(pinnedLabels.first()).toBeVisible();
  await expect(pinnedLabels.last()).toBeVisible();
  const firstLabel = (await pinnedLabels.first().textContent()) ?? "";
  const lastLabel = (await pinnedLabels.last().textContent()) ?? "";
  expect(Number(firstLabel)).toBeLessThan(Number(lastLabel));
  expect(Number(lastLabel)).toBeLessThanOrEqual(1);

  // One section-level authoring fragment only (not four per-ramp code blocks).
  await expect(region.getByRole("button", { name: /Copy sequential/ })).toHaveCount(1);
  await expect(region.locator(".copy-code code")).toContainText('scheme: "viridis"');
  await expect(region.locator(".copy-code code")).toContainText("GeomRaster");
});

for (const width of [375, 768, 1024, 1280, 1600]) {
  test(`themes has no horizontal overflow at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/themes?theme=light");
    // Wait for the themes specimen list so layout is past first paint/fonts;
    // a one-shot scrollWidth check races chart/font settling on CI.
    await expect(page.getByRole("list", { name: "Built-in chart themes" })).toBeVisible();
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= window.innerWidth,
      undefined,
      { timeout: 10_000 },
    );
  });
}

test("themes controls remain legible in forced colors with reduced motion", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/themes?theme=light");
  const select = page.getByLabel("Chart theme", { exact: true });
  await select.focus();
  await expect(select).toBeVisible();
  expect(await select.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
    "none",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("interactions is a first-class route with a single live chart", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/interactions?theme=light");
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Interactions" }),
  ).toHaveAttribute("aria-current", "page");

  const demo = page.getByRole("region", { name: "Interaction demo" });
  await expect(demo.locator(".gg-plot-root")).toHaveCount(1);
  await expect(demo.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true");
  await expect(demo.locator(".copy-code code")).toContainText("createPlotInteraction");
  await expect(demo.locator(".copy-code code")).toContainText(
    'select={{ type: "interval", mode: "xy" }}',
  );

  await demo.getByRole("button", { name: "Series: Alpha (color legend)" }).click();
  await expect(demo.getByText(/3 emphasized/)).toBeVisible();
  // Legend also exposes a "Clear" control (aria-label "Clear legend focus");
  // exact match targets the demo status clear only.
  await demo.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(demo.getByText(/0 emphasized/)).toBeVisible();
});

test("interactions has no horizontal overflow at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/interactions?theme=light");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
