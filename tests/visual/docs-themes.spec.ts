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
  await expect(page.getByRole("link", { name: "Built-in chart themes" })).toHaveAttribute(
    "href",
    /\/themes$/,
  );
});

test("palettes is a first-class route from site navigation and the homepage", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/palettes?theme=light");
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Palettes" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Palettes" }),
  ).toBeVisible();

  // Palettes sits between Themes and Reference in primary nav order.
  const primary = page.getByRole("navigation", { name: "Primary" });
  const labels = await primary.getByRole("link").allTextContents();
  const themesIdx = labels.indexOf("Themes");
  const palettesIdx = labels.indexOf("Palettes");
  const referenceIdx = labels.indexOf("Reference");
  expect(themesIdx).toBeGreaterThanOrEqual(0);
  expect(palettesIdx).toBe(themesIdx + 1);
  expect(referenceIdx).toBe(palettesIdx + 1);

  await page.goto("/?theme=light");
  await expect(
    page.getByRole("link", { name: "Categorical palettes and sequential scales" }),
  ).toHaveAttribute("href", /\/palettes$/);
});

test("themes compares all built-in chart themes as full-width interactive portraits", async ({
  page,
}) => {
  // Intent-gated live load per portrait; budget scales with the registry so
  // ggthemes ports do not trip the default 60s test timeout.
  test.setTimeout(240_000);
  await page.goto("/themes?theme=light");

  const list = page.getByRole("list", { name: "Built-in chart themes" });
  const specimens = list.getByRole("listitem");
  // Non-alias product themes (grey/gray alias ggplot2; not separate portraits).
  await expect(specimens).toHaveCount(36);
  await expect(specimens.getByRole("heading", { level: 3 })).toHaveText([
    "Default",
    "Light",
    "Dark",
    "Minimal",
    "ggplot2",
    "Classic",
    "B&W",
    "HRBR",
    "Few",
    "Clean",
    "FiveThirtyEight",
    "Economist",
    "Tufte",
    "Linedraw",
    "Void",
    "Stata",
    "Stata S1 Color",
    "Stata Mono",
    "Solarized",
    "Solarized Dark",
    "Economist White",
    "Solarized 2",
    "Solarized 2 Dark",
    "WSJ",
    "Google Docs",
    "Highcharts",
    "Highcharts Dark",
    "Pander",
    "Calc",
    "Excel",
    "Excel New",
    "Base",
    "Inverse Gray",
    "Map",
    "Solid",
    "Test",
  ]);

  // Specimens stay on static shells until hover/focus (intent-gated load).
  for (const specimen of await specimens.all()) {
    await specimen.scrollIntoViewIfNeeded();
    await specimen.locator(".plot-panel").hover();
    await expect(specimen.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true", {
      timeout: 30_000,
    });
    // No per-specimen CopyCode after the redesign.
    await expect(specimen.getByRole("button", { name: /^Copy / })).toHaveCount(0);
    // Charts use real corpora — never the old 8-dot synthetic scatter.
    await expect(specimen.locator(".gg-plot-root")).toBeVisible();
  }
});

test("chart theme lab picks theme and palette without alias or chrome clutter", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/themes?theme=light");

  const lab = page.getByRole("region", { name: "Chart theme and palette lab" });
  const chartTheme = lab.getByLabel("Chart theme", { exact: true });
  const palette = lab.getByLabel("Categorical palette", { exact: true });
  const plot = lab.locator(".gg-plot-root");
  // Lab stays static until the user engages a control or the plot.
  await chartTheme.focus();
  await expect(plot).toHaveAttribute("data-gg-ready", "true", { timeout: 30_000 });
  const chartPaper = () => plot.locator(".gg-paper").getAttribute("fill");

  // No grey/gray theme alias rows (both map to ggplot2) and no gray palette
  // twin (same ramp as grey). No follow-docs checkbox or theme=/scheme= status
  // echo that only restates the selects.
  const themeLabels = await chartTheme.locator("option").allTextContents();
  expect(themeLabels.filter((label) => /^Gre[ya]y$/i.test(label))).toHaveLength(0);
  const paletteLabels = await palette.locator("option").allTextContents();
  expect(paletteLabels.filter((label) => label === "Gray")).toHaveLength(0);
  expect(paletteLabels.filter((label) => label === "Grey")).toHaveLength(1);
  await expect(lab.getByRole("checkbox", { name: "Follow docs appearance" })).toHaveCount(0);
  await expect(lab.getByRole("status")).toHaveCount(0);
  await expect(lab.getByText(/theme="/)).toHaveCount(0);
  await expect(lab.getByText(/scheme="/)).toHaveCount(0);

  await chartTheme.selectOption("economist");
  await expect.poll(chartPaper).toBe("var(--gg-paper, #d5e4eb)");
  // Palette is independent of theme.
  await palette.selectOption("tableau10");
  await expect(palette).toHaveValue("tableau10");
  await expect(chartTheme).toHaveValue("economist");

  // Site appearance must not hijack the chart theme.
  await page.getByRole("button", { name: "Dark appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(chartPaper).toBe("var(--gg-paper, #d5e4eb)");
});

test("categorical palettes show ordered swatches and reverse without hex code chrome", async ({
  page,
}) => {
  await page.goto("/palettes?theme=light");

  const region = page.getByRole("region", { name: "Categorical palettes" });
  const rows = region.getByRole("list", { name: "Categorical palettes" }).locator(":scope > li");
  // Unique schemes only — "gray" is a US-spelling alias of "grey", not a twin
  // row. Default order is label-alphabetical (sort control: Name/Color count).
  await expect(rows).toHaveCount(48);
  await expect(rows.locator(".name")).toHaveText([
    "Accent",
    "Calc",
    "Canva",
    "Colorblind",
    "Dark2",
    "Economist",
    "Excel",
    "Excel Fill",
    "Excel New",
    "Few",
    "Few Dark",
    "Few Light",
    "FiveThirtyEight",
    "Flexoki",
    "Google Docs",
    "Green/Orange/Teal",
    "Grey",
    "Highcharts",
    "Highcharts Dark",
    "Hue",
    "Hue Circle",
    "Ipsum",
    "Jewel Bright",
    "Miller Stone",
    "Nuriel Stone",
    "Observable 10",
    "Paired",
    "Pander",
    "Paul Tol",
    "Purple/Pink/Gray",
    "Red/Blue/Brown",
    "Seattle Grays",
    "Solarized",
    "Stata",
    "Stata Mono",
    "Stata S1 Color",
    "Stata S1R Color",
    "Summer",
    "Superfishel Stone",
    "Tableau 10",
    "Tableau 20",
    "Tableau Color Blind",
    "Winter",
    "WSJ",
    "WSJ Black/Green",
    "WSJ Dem/Rep",
    "WSJ R/G/B/Y",
    "WSJ Red/Green",
  ]);
  await expect(rows.locator(".capacity")).toHaveText([
    "8 colors",
    "12 colors",
    "4 colors",
    "8 colors",
    "8 colors",
    "9 colors",
    "7 colors",
    "7 colors",
    "6 colors",
    "8 colors",
    "8 colors",
    "8 colors",
    "3 colors",
    "8 colors",
    "24 colors",
    "12 colors",
    "10 colors",
    "10 colors",
    "11 colors",
    "10 colors",
    "19 colors",
    "9 colors",
    "9 colors",
    "11 colors",
    "9 colors",
    "10 colors",
    "12 colors",
    "8 colors",
    "12 colors",
    "12 colors",
    "12 colors",
    "5 colors",
    "8 colors",
    "15 colors",
    "15 colors",
    "15 colors",
    "15 colors",
    "8 colors",
    "10 colors",
    "10 colors",
    "20 colors",
    "10 colors",
    "10 colors",
    "6 colors",
    "4 colors",
    "3 colors",
    "4 colors",
    "2 colors",
  ]);

  // Sort control re-orders by capacity, ties broken by label: the single
  // 2-color scheme leads.
  await region.getByRole("combobox", { name: "Sort" }).selectOption("capacity");
  await expect(rows.locator(".name").first()).toHaveText("WSJ Red/Green");

  const observable = region.getByRole("button", { name: /Observable 10/ });
  const swatches = observable
    .getByRole("list", { name: "Observable 10 ordered colors" })
    .getByRole("listitem");
  await expect(swatches).toHaveCount(10);
  // Hex lives in accessible names only — not as visible code under every chip.
  await expect(swatches.first()).toHaveAttribute("aria-label", "1: #4269d0");
  await expect(swatches.last()).toHaveAttribute("aria-label", "10: #9498a0");
  await expect(swatches.first().locator("code")).toHaveCount(0);

  // One shared preview chart hydrates eagerly; pinned default is Observable 10.
  const preview = page.getByRole("region", { name: "Palette preview" });
  await expect(preview.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true", {
    timeout: 30_000,
  });
  const firstMark = preview.locator(".gg-plot-root [fill='#4269d0']").first();
  await expect(firstMark).toBeVisible();

  // Hover previews transiently; click pins the selection (aria-pressed).
  const tableau = region.getByRole("button", { name: /Tableau 10 / });
  await tableau.hover();
  await expect(preview.getByRole("heading", { name: "Tableau 10" })).toBeVisible();
  await tableau.click();
  await expect(tableau).toHaveAttribute("aria-pressed", "true");
  await expect(preview.getByRole("heading", { name: "Tableau 10" })).toBeVisible();

  // Screen-reader announcement tracks the previewed scheme.
  await expect(page.getByRole("status")).toContainText("Previewing Tableau 10");

  // Exact inspect: tooltip on the bar, no full-panel crosshair guides.
  const capture = preview.locator(".gg-capture");
  await capture.focus();
  await capture.press("ArrowRight");
  const tooltip = preview.locator(".gg-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(preview.locator(".gg-crosshair")).toHaveCount(0);

  await region.getByRole("checkbox", { name: "Reverse" }).check();
  await expect(swatches.first()).toHaveAttribute("aria-label", "1: #9498a0");
  await expect(swatches.last()).toHaveAttribute("aria-label", "10: #4269d0");
  await region.getByRole("button", { name: /Observable 10/ }).click();
  await expect(preview.locator(".gg-plot-root [fill='#9498a0']").first()).toBeVisible();

  // No per-palette CopyCode.
  await expect(region.getByRole("button", { name: /^Copy / })).toHaveCount(0);

  await region.getByRole("combobox", { name: "Chart paper" }).selectOption("dark");
  await expect(preview.locator(".gg-paper")).toHaveAttribute("fill", "var(--gg-paper, #16181d)");
});

test("sequential color compares direction, custom stops, and a pinned domain on raster", async ({
  page,
}) => {
  await page.goto("/palettes/ramps?theme=light");

  // Every registered sequential scheme gets a strip on the index.
  const index = page.getByRole("list", { name: "Sequential color schemes" });
  await expect(index.locator(":scope > li")).toHaveCount(50);

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
    await card.scrollIntoViewIfNeeded();
    await card.locator(".plot-panel").hover();
    await expect(card.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true", {
      timeout: 30_000,
    });
    // Raster surface, not the old 6-point scatter.
    await expect(card.locator(".gg-points circle")).toHaveCount(0);
  }

  // Pinned domain uses Macdonell man-counts mid-window (catalog RASTER_Z_DOMAIN).
  const pinnedLabels = cards.nth(3).locator(".gg-legend-label");
  await expect(pinnedLabels.first()).toBeVisible();
  await expect(pinnedLabels.last()).toBeVisible();
  const firstLabel = (await pinnedLabels.first().textContent()) ?? "";
  const lastLabel = (await pinnedLabels.last().textContent()) ?? "";
  expect(Number(firstLabel)).toBeLessThan(Number(lastLabel));
  expect(Number(firstLabel)).toBeGreaterThan(0);
  expect(Number(lastLabel)).toBeLessThanOrEqual(100);

  // One section-level authoring fragment only (not four per-ramp code blocks).
  await expect(region.getByRole("button", { name: /Copy sequential/ })).toHaveCount(1);
  await expect(region.locator(".copy-code code")).toContainText('scheme: "viridis"');
  await expect(region.locator(".copy-code code")).toContainText("GeomRaster");
});

// One navigation per page, then resize — five separate gotos re-hydrated every
// theme/palette portrait (~38s each on CI). Shared load keeps the five-width
// contract without reloading the heavy page (#1037).
const OVERFLOW_WIDTHS = [375, 768, 1024, 1280, 1600] as const;

test("themes has no horizontal overflow at all five widths", async ({ page }) => {
  await page.goto("/themes?theme=light");
  // Wait for the themes specimen list so layout is past first paint/fonts;
  // a one-shot scrollWidth check races chart/font settling on CI.
  await expect(page.getByRole("list", { name: "Built-in chart themes" })).toBeVisible();

  for (const width of OVERFLOW_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= window.innerWidth,
      undefined,
      { timeout: 10_000 },
    );
  }
});

test("palettes has no horizontal overflow at all five widths", async ({ page }) => {
  await page.goto("/palettes?theme=light");
  await expect(page.getByRole("list", { name: "Categorical palettes" })).toBeVisible();

  for (const width of OVERFLOW_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= window.innerWidth,
      undefined,
      { timeout: 10_000 },
    );
  }
});

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
