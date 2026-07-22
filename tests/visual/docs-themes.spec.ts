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

test("categorical palettes show exact ordered colors and reverse", async ({ page }) => {
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

  await region.getByRole("checkbox", { name: "Reverse" }).check();
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

test("sequential color compares direction, custom stops, and a pinned domain", async ({ page }) => {
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
  await demo.getByRole("button", { name: "Clear" }).click();
  await expect(demo.getByText(/0 emphasized/)).toBeVisible();
});

test("interactions has no horizontal overflow at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/interactions?theme=light");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
