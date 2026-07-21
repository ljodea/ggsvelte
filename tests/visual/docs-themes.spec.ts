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
  const defaultCard = page
    .getByRole("list", { name: "Built-in chart themes" })
    .locator(":scope > li")
    .first();
  await defaultCard.getByRole("button", { name: "Copy Default theme code" }).click();
  await expect(defaultCard.getByRole("status")).toHaveText(
    "Clipboard unavailable. Code selected for manual copy.",
  );
  expect(await page.evaluate(() => getSelection()?.toString())).toContain('theme="default"');
});

test("themes compares all built-in chart themes on the same live chart", async ({ page }) => {
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
    await expect(specimen.locator(".gg-points circle")).toHaveCount(8);
    await expect(specimen.getByRole("button", { name: /^Copy .+ theme code$/ })).toBeVisible();
  }
});

test("chart theme stays separate until follow-docs appearance is explicit", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/themes?theme=light");

  const lab = page.getByRole("region", { name: "Chart theme lab" });
  const chartTheme = lab.getByLabel("Chart theme", { exact: true });
  const follow = lab.getByRole("checkbox", { name: "Follow docs appearance" });
  const plot = lab.locator(".gg-plot-root");
  const chartPaper = () => plot.locator(".gg-paper").getAttribute("fill");

  await chartTheme.selectOption("economist");
  await expect(lab.locator(".copy-code code")).toContainText('theme="economist"');
  await expect.poll(chartPaper).toBe("var(--gg-paper, #d5e4eb)");
  await page.getByRole("button", { name: "Dark appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(chartPaper).toBe("var(--gg-paper, #d5e4eb)");

  await follow.check();
  await expect(lab.locator(".copy-code code")).toContainText('theme="dark"');
  await expect.poll(chartPaper).toBe("var(--gg-paper, #16181d)");
  await page.getByRole("button", { name: "Light appearance" }).click();
  await expect.poll(chartPaper).toBe("var(--gg-paper, #ffffff)");

  await follow.uncheck();
  await expect(chartTheme).toHaveValue("economist");
  await expect.poll(chartPaper).toBe("var(--gg-paper, #d5e4eb)");
});

test("categorical schemes show exact ordered colors and explicit behavior", async ({ page }) => {
  await page.goto("/themes?theme=light");

  const region = page.getByRole("region", { name: "Categorical color schemes" });
  const cards = region.getByRole("list", { name: "Categorical palettes" }).locator(":scope > li");
  await expect(cards).toHaveCount(5);
  await expect(cards.getByRole("heading", { level: 3 })).toHaveText([
    "Observable 10",
    "Ipsum",
    "Flexoki",
    "Tableau 10",
    "Colorblind",
  ]);
  await expect(cards.getByText(/colors$/)).toHaveText([
    "10 colors",
    "9 colors",
    "8 colors",
    "10 colors",
    "8 colors",
  ]);

  const observable = cards.first();
  await expect(
    observable.getByRole("list", { name: "Observable 10 ordered colors" }).getByRole("listitem"),
  ).toHaveText([
    "#4269d0",
    "#efb118",
    "#ff725c",
    "#6cc5b0",
    "#3ca951",
    "#ff8ab7",
    "#a463f2",
    "#97bbf5",
    "#9c6b4e",
    "#9498a0",
  ]);
  const firstMark = observable.locator(".gg-points circle").first();
  await expect(firstMark).toHaveAttribute("fill", "#4269d0");

  await region.getByRole("checkbox", { name: "Reverse palettes" }).check();
  const reversedSwatches = observable
    .getByRole("list", { name: "Observable 10 ordered colors" })
    .getByRole("listitem");
  await expect(reversedSwatches.first()).toHaveText("#9498a0");
  await expect(reversedSwatches.last()).toHaveText("#4269d0");
  await expect(firstMark).toHaveAttribute("fill", "#9498a0");
  await expect(observable.locator(".copy-code code")).toContainText("reverse: true");
  await region.getByLabel("Chart paper", { exact: true }).selectOption("dark");
  await expect(observable.locator(".gg-paper")).toHaveAttribute("fill", "var(--gg-paper, #16181d)");
  await expect(observable.locator(".copy-code code")).toContainText('theme="dark"');
  await expect(firstMark).toHaveAttribute("fill", "#9498a0");
});

test("palette limits expose real warnings and caught failures", async ({ page }) => {
  await page.goto("/themes?theme=light");

  const demo = page.getByRole("region", { name: "Palette limits" });
  await expect(demo.getByText("scale-scheme-type", { exact: true })).toBeVisible();
  await expect(demo.getByText("palette-exhausted", { exact: true })).toBeVisible();
  await expect(demo.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true");
  const marks = demo.locator(".gg-points circle");
  await expect(marks).toHaveCount(3);
  await expect(marks.nth(0)).toHaveAttribute("fill", "#123456");
  await expect(marks.nth(2)).toHaveAttribute("fill", "#123456");

  await demo.getByLabel("Exhaustion behavior").selectOption("error");
  await expect(demo.getByRole("alert")).toContainText("Palette exhausted");
  await expect(demo.getByText("/scales/color", { exact: true })).toBeVisible();
  await expect(demo.locator(".gg-plot-root")).toHaveCount(0);
});

test("sequential color compares direction, custom stops, and a pinned domain", async ({ page }) => {
  await page.goto("/themes?theme=light");

  const region = page.getByRole("region", { name: "Sequential color scales" });
  const cards = region
    .getByRole("list", { name: "Sequential scale examples" })
    .locator(":scope > li");
  await expect(cards).toHaveCount(4);
  await expect(cards.getByRole("heading", { level: 3 })).toHaveText([
    "Viridis",
    "Reversed viridis",
    "Custom range",
    "Pinned domain",
  ]);

  const normalMarks = cards.nth(0).locator(".gg-points circle");
  await expect(normalMarks.first()).toHaveAttribute("fill", "#440154");
  await expect(normalMarks.last()).toHaveAttribute("fill", "#fde725");
  const reversedMarks = cards.nth(1).locator(".gg-points circle");
  await expect(reversedMarks.first()).toHaveAttribute("fill", "#fde725");
  await expect(reversedMarks.last()).toHaveAttribute("fill", "#440154");
  const customMarks = cards.nth(2).locator(".gg-points circle");
  await expect(customMarks.first()).toHaveAttribute("fill", "#2d1e2f");
  await expect(customMarks.last()).toHaveAttribute("fill", "#e76f51");
  await expect(cards.nth(3).locator(".gg-legend-label").first()).toHaveText("0");
  await expect(cards.nth(3).locator(".gg-legend-label").last()).toHaveText("100");

  await expect(cards.nth(0).locator(".copy-code code")).toContainText('scheme: "viridis"');
  await expect(cards.nth(1).locator(".copy-code code")).toContainText("reverse: true");
  await expect(cards.nth(2).locator(".copy-code code")).toContainText('range: ["#2d1e2f"');
  await expect(cards.nth(3).locator(".copy-code code")).toContainText("domain: [0, 100]");
});

test("custom interaction theme preserves linked emphasis across SVG and canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/themes?theme=light");

  const region = page.getByRole("region", { name: "Custom interaction theme" });
  const plots = region.locator(".gg-plot-root");
  await expect(region.locator(".copy-code code")).toContainText(
    'import { createPlotInteraction, GGPlot, type ThemeSpec } from "@ggsvelte/svelte"',
  );
  await expect(region.locator(".copy-code code")).toContainText("satisfies ThemeSpec");
  await expect(region.locator(".copy-code code")).toContainText(
    'layers={[{ geom: "point", params: { size: 4 } }]}',
  );
  await expect(plots).toHaveCount(2);
  await expect(plots.nth(0).locator("svg.gg-plot")).toBeVisible();
  await expect(plots.nth(1).locator("canvas")).toBeVisible();
  const alphaMarks = plots.nth(0).locator('.gg-points circle[fill="#4269d0"]');
  await expect(alphaMarks).toHaveCount(3);

  await plots.nth(0).getByRole("button", { name: "Series: Alpha (color legend)" }).click();
  await expect(region.getByText("3 rows emphasized", { exact: true })).toBeVisible();
  await expect(plots.nth(0).locator('circle[data-gg-focused="false"]').first()).toHaveAttribute(
    "opacity",
    "0.18",
  );

  await region.getByLabel("Interaction chart paper").selectOption("dark");
  await expect(region.getByText("3 rows emphasized", { exact: true })).toBeVisible();
  await expect(alphaMarks).toHaveCount(3);
  await page.getByRole("button", { name: "Dark appearance" }).click();
  await expect(region.getByText("3 rows emphasized", { exact: true })).toBeVisible();

  await region.getByRole("button", { name: "Clear shared state" }).click();
  await expect(region.getByText("0 rows emphasized", { exact: true })).toBeVisible();
});

for (const width of [375, 768, 1024, 1280, 1600]) {
  test(`themes has no horizontal overflow at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/themes?theme=light");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
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

test("inspection overlays stay local and use custom interaction roles", async ({ page }) => {
  await page.goto("/themes?theme=light");

  const region = page.getByRole("region", { name: "Custom interaction theme" });
  const plots = region.locator(".gg-plot-root");
  const svgPlot = plots.nth(0);
  const canvasPlot = plots.nth(1);
  const toolbar = svgPlot.getByRole("toolbar", { name: "Chart interaction tools" });
  await expect(toolbar.locator(".gg-tool-modes").getByRole("button")).toHaveText([
    "Inspect",
    "Select area",
    "Zoom area",
  ]);

  const capture = svgPlot.locator(".gg-capture");
  await capture.focus();
  await expect(capture).toHaveCSS("outline-color", "rgb(230, 57, 70)");
  await capture.press("ArrowRight");
  await expect(svgPlot.locator(".gg-tooltip")).toBeVisible();
  await expect(svgPlot.locator(".gg-crosshair")).not.toHaveCount(0);
  await expect(canvasPlot.locator(".gg-tooltip")).toHaveCount(0);
  await expect(canvasPlot.locator(".gg-crosshair")).toHaveCount(0);
});
