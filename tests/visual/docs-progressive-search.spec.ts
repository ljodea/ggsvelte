import { expect, test } from "@playwright/test";

async function expectNoDocumentOverflow(page: import("@playwright/test").Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test("Getting Started renders the packed file and the built-up chart", async ({ page }) => {
  await page.goto("/guide/getting-started?theme=light");

  const guide = page.locator("article.getting-started-guide");
  await expect(guide.getByRole("heading", { level: 1 })).toHaveText("Getting started");

  // The first render is the honest starting chart: every observation, no
  // styling. It is a build-time render, so it is an image, not a live plot.
  const firstChart = guide.locator(".first-result img.lesson-chart");
  await expect(firstChart).toBeVisible();
  await expect(firstChart).toHaveJSProperty("naturalWidth", 660);

  await expect(guide.locator(".lesson-source--file code").first()).toContainText(
    'import { kyotoSakura } from "@ggsvelte/svelte/data"',
  );
  await expectNoDocumentOverflow(page);
});

test("each step shows its own delta and the finished chart is live", async ({ page }) => {
  await page.goto("/guide/getting-started?theme=light");
  const steps = page.locator(".progressive-step");
  await expect(steps).toHaveCount(6);
  await expect(steps.getByRole("heading", { level: 3 })).toHaveText([
    "Separate the signal from the noise",
    "Put earlier bloom on top",
    "Put the climate behind the data",
    "Name the records",
    "Finish it",
    "Make it answer questions — and notice it is data",
  ]);

  // Every step chart is a build-time render; the page carries exactly one
  // live plot, the finished chart, where inspection is worth demonstrating.
  await expect(steps.locator("img.lesson-chart")).toHaveCount(6);
  await expect(steps.locator(".gg-plot-root")).toHaveCount(0);
  const finished = page.locator(".finished-chart .gg-plot-root");
  await expect(finished).toHaveAttribute("data-gg-ready", "true");
  await expect(page.locator(".gg-plot-root")).toHaveCount(1);
  await expectNoDocumentOverflow(page);
});

test("the finished chart answers keyboard inspection", async ({ page }) => {
  await page.goto("/guide/getting-started?theme=light");
  const capture = page.locator(".finished-chart .gg-capture");
  await expect(capture).toBeVisible();
  await capture.focus();
  await capture.press("ArrowRight");
  await expect(page.locator(".finished-chart .gg-tooltip")).toBeVisible();
});

/*
 * The library sets `forced-color-adjust: none` on `.gg-plot`, so nothing in a
 * chart adapts on its own. The epoch bands are the one mark carried by fill
 * alone, so under a requested palette they drop and the names in the note
 * under the chart do the work instead. Asserted through `emulateMedia`:
 * `forcedColors` is not a Playwright test option, so `test.use` would be
 * dropped by the runner and this would silently measure a normal page
 * (issue #718 — see playwright.config.ts).
 */
test("the finished chart drops its band fills and names the epochs in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/guide/getting-started?theme=light");
  const finished = page.locator(".finished-chart");
  await expect(finished.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true");
  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);

  const fills = await finished
    .locator(".gg-marks rect")
    .evaluateAll((rects) => rects.map((rect) => getComputedStyle(rect).fill));
  expect(fills.length).toBeGreaterThan(0);
  expect(new Set(fills)).toEqual(new Set(["none"]));
  await expect(finished.locator(".chart-note")).toContainText("Bands, left to right:");
});

test("Docs landing and sidebar expose the full path without duplicate Reference", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/docs?theme=light");
  const tasks = page.getByRole("navigation", { name: "Documentation tasks" });
  await expect(tasks.getByRole("link", { name: /Getting started/ })).toHaveAttribute(
    "href",
    /\/guide\/getting-started$/,
  );
  await expect(tasks.getByRole("link", { name: /Scales, themes, color/ })).toHaveAttribute(
    "href",
    /\/guide\/scales-guides$/,
  );
  await expect(tasks.getByRole("link", { name: /^Interaction/ })).toHaveAttribute(
    "href",
    /\/guide\/inspect-pin$/,
  );
  await expect(tasks.getByRole("link", { name: /Layout and export/ })).toHaveAttribute(
    "href",
    /\/guide\/responsive-charts$/,
  );
  // Diagnostics is deliberately absent from the landing tasks; it stays in
  // the sidebar and search.
  await expect(tasks.getByRole("link", { name: /Diagnostics/ })).toHaveCount(0);

  const sidebar = page.getByRole("navigation", { name: "Guide chapters" });
  await expect(sidebar.getByRole("heading", { level: 2 })).toHaveText([
    "Start",
    "Core grammar",
    "Interaction",
    "Production",
    "Reference",
    "Release",
  ]);
  await expect(sidebar.getByRole("link")).toHaveCount(26);
  await expect(sidebar.getByRole("link", { name: "Dates without preprocessing" })).toBeVisible();
  await expectNoDocumentOverflow(page);

  await page.goto("/guide/errors?theme=light");
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Reference" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Docs" }),
  ).not.toHaveAttribute("aria-current", "page");

  await page.goto("/guide/interaction-reference?theme=light");
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Reference" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Reference");
});

test("prerendered Docs and lesson source remain useful without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/docs?theme=light");
  await expect(page.getByRole("navigation", { name: "Documentation tasks" })).toContainText(
    "Getting started",
  );
  await page.goto("/guide/getting-started?theme=light");
  await expect(page.locator(".lesson-source--file code").first()).toContainText(
    'import { kyotoSakura } from "@ggsvelte/svelte/data"',
  );
  // Every step chart is a build-time render, so the whole lesson is readable
  // with no JavaScript at all — only the inspect step loses its interaction.
  await expect(page.locator(".first-result .lesson-output")).toBeVisible();
  await expect(page.locator("img.lesson-chart")).toHaveCount(7);
  await expect(
    page.getByRole("heading", { level: 3, name: "Separate the signal from the noise" }),
  ).toBeVisible();
  await context.close();
});

test("CLI reference renders every implementation-owned option anchor", async ({ page }) => {
  await page.goto("/reference/cli?theme=light");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Command-line reference");
  for (const anchor of ["width", "height", "data", "max-marks", "version", "help"]) {
    await expect(page.locator(`#${anchor}`)).toBeVisible();
  }
  await expect(page.locator("#max-marks")).toContainText("--max-marks");
  await expectNoDocumentOverflow(page);
});

for (const chapter of [
  {
    group: "core grammar",
    path: "/guide/scales-guides",
    heading: "Scales and guides",
    evidence: "/examples/line/time-axis",
  },
  {
    group: "interaction",
    path: "/guide/inspect-pin",
    heading: "Inspect and pin",
    evidence: "/examples/interaction/tooltip",
  },
  {
    group: "production",
    path: "/guide/server-rendering-export",
    heading: "Server rendering and export",
    evidence: "/reference/cli",
  },
  {
    group: "release",
    path: "/guide/upgrading",
    heading: "Upgrade in five minutes",
    evidence: "/guide/lifecycle#lifecycle-tags",
  },
] as const) {
  test(`${chapter.group} chapter keeps evidence and sequence navigation`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${chapter.path}?theme=light`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(chapter.heading);
    await expect(page.getByRole("navigation", { name: "On this page" }).first()).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Previous and next chapters" }),
    ).toBeVisible();
    await expect(page.locator(`a[href$="${chapter.evidence}"]`).first()).toBeVisible();
    await expect(page.locator(".guide-code-classification")).toHaveCount(0);
    await expectNoDocumentOverflow(page);
  });
}

test("global search implements the combobox/listbox keyboard contract", async ({ page }) => {
  await page.goto("/docs?theme=light");
  const trigger = page.getByRole("button", { name: "Search documentation" }).first();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Search documentation" });
  const input = dialog.getByRole("combobox", { name: "Search docs" });
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-haspopup", "listbox");
  await expect(input).toHaveAttribute("aria-controls", "docs-search-results");
  await expect(dialog.locator("#docs-search-results")).toHaveAttribute("role", "listbox");
  await expect(dialog.getByRole("link", { name: "Getting started" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Getting started" })).not.toHaveAttribute(
    "role",
    "option",
  );

  await input.fill("scale-scheme-type");
  const options = dialog.getByRole("option");
  await expect(options.first()).toHaveAttribute("href", /\/guide\/errors#scale-scheme-type$/);
  await expect(input).toHaveAttribute("aria-expanded", "true");
  const firstId = await options.first().getAttribute("id");
  await expect(input).toHaveAttribute("aria-activedescendant", firstId!);
  await input.press("End");
  await expect(options.last()).toHaveAttribute("aria-selected", "true");
  await input.press("Home");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("status")).toContainText("result");

  await input.fill("no-such-ggsvelte-contract");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(dialog.getByText("No matching documentation.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Diagnostics" })).toBeVisible();
  await input.evaluate((element) => {
    (element as HTMLInputElement).setSelectionRange(4, 4);
  });
  await input.press("Home");
  await expect
    .poll(() => input.evaluate((element) => (element as HTMLInputElement).selectionStart))
    .toBe(0);
  await input.press("End");
  await expect
    .poll(() => input.evaluate((element) => (element as HTMLInputElement).selectionStart))
    .toBe("no-such-ggsvelte-contract".length);
  await input.press("Escape");
  await expect(trigger).toBeFocused();
});

test("search Enter follows the active focused result", async ({ page }) => {
  await page.goto("/docs?theme=light");
  await page.getByRole("button", { name: "Search documentation" }).first().click();
  const input = page.getByRole("combobox", { name: "Search docs" });
  await input.fill("tooltip");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/guide\/inspect-pin$/);
});

test("global search preserves forced colors, reduced motion, and a clean console", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/docs?theme=light");
  await page.getByRole("button", { name: "Search documentation" }).first().click();
  const input = page.getByRole("combobox", { name: "Search docs" });
  await input.fill("GGPlot");
  await expect(page.getByRole("option").first()).toBeVisible();
  await expect(input).toBeFocused();
  expect(errors).toEqual([]);
});

test("global search is reachable from compact chrome and survives 200 percent zoom", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 800 });
  await page.goto("/docs?theme=light");
  const trigger = page.getByRole("button", { name: "Search documentation" });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.getByRole("combobox", { name: "Search docs" }).fill("GGPlot");
  await expect(page.getByRole("option").first()).toContainText("GGPlot");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expectNoDocumentOverflow(page);
});

test("mobile lesson keeps result before source and remains contained", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/guide/getting-started?theme=light");

  const order = await page
    .locator(".first-result > section")
    .evaluateAll((sections) => sections.map((section) => section.getAttribute("class")));
  expect(order[0]).toContain("lesson-output");
  expect(order[1]).toContain("lesson-code");

  const tabs = page.getByRole("tablist", { name: "First chart surfaces" });
  const output = tabs.getByRole("tab", { name: "Output" });
  const svelte = tabs.getByRole("tab", { name: "Svelte" });
  await expect(output).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#first-output-panel")).toBeVisible();
  await expect(page.locator("#first-svelte-panel")).toBeHidden();
  await svelte.click();
  await expect(page.locator("#first-svelte-panel")).toBeVisible();
  await svelte.press("Home");
  await expect(output).toBeFocused();
  await expect(page.locator("#first-output-panel")).toBeVisible();
  await expectNoDocumentOverflow(page);
});
