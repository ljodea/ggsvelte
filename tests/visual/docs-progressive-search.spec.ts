import { expect, test } from "@playwright/test";

async function expectNoDocumentOverflow(page: import("@playwright/test").Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test("Getting Started renders the packed file and first live grammar delta", async ({ page }) => {
  await page.goto("/guide/getting-started?theme=light");

  const guide = page.locator("article.getting-started-guide");
  await expect(guide.getByRole("heading", { level: 1 })).toHaveText("Getting started");
  await expect(guide.locator(".first-result .gg-plot-root")).toHaveAttribute(
    "data-gg-ready",
    "true",
  );
  await expect(guide.locator(".first-result .gg-points circle")).toHaveCount(4);
  await expect(guide.locator(".lesson-source--file code")).toContainText(
    'import { GeomPoint, GGPlot } from "@ggsvelte/svelte"',
  );

  const step = guide.locator(".progressive-step").first();
  await expect(step.getByRole("heading", { level: 3 })).toHaveText("Map fields to position");
  await expect(step.getByText("Fragment", { exact: true })).toBeVisible();
  await expect(step.locator(".gg-points circle")).toHaveCount(8);
  await expect(step.getByRole("link", { name: "Read Data and mappings" })).toHaveAttribute(
    "href",
    /\/guide\/data-mappings#map-fields-to-position$/,
  );
  await expectNoDocumentOverflow(page);
});

test("each progressive step changes the real chart through its public contract", async ({
  page,
}) => {
  await page.goto("/guide/getting-started?theme=light");
  const steps = page.locator(".progressive-step");
  await expect(steps).toHaveCount(7);
  await expect(steps.getByRole("heading", { level: 3 })).toHaveText([
    "Map fields to position",
    "Add a second layer",
    "Make color meaning explicit",
    "Add a statistical smoother",
    "Facet the comparison",
    "Choose a chart theme",
    "Enable inspect and pin",
  ]);

  await expect(steps.nth(0).locator(".gg-paths path")).toHaveCount(0);
  await expect(steps.nth(1).locator(".gg-paths path")).toHaveCount(1);
  await expect(steps.nth(2).locator(".gg-paths path")).toHaveCount(2);
  await expect(steps.nth(2).locator(".gg-points circle").first()).toHaveAttribute(
    "fill",
    "#4269d0",
  );
  await expect(steps.nth(3).locator(".gg-paths path")).toHaveCount(4);
  for (const index of [4, 5, 6]) {
    await expect(steps.nth(index).locator(".gg-panel")).toHaveCount(2);
    await expect(steps.nth(index).locator(".gg-paths path")).toHaveCount(4);
    await expect(steps.nth(index).locator(".gg-points circle").first()).toHaveAttribute(
      "fill",
      "#4269d0",
    );
  }
  for (const index of [5, 6]) {
    await expect(steps.nth(index).locator(".gg-paper")).toHaveAttribute(
      "fill",
      "var(--gg-paper, #d5e4eb)",
    );
  }
  await expect(steps.nth(6).locator(".gg-capture")).toBeVisible();
});

test("Docs landing and sidebar expose the full task-first path without duplicate Reference", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/docs?theme=light");
  const tasks = page.getByRole("navigation", { name: "Documentation tasks" });
  await expect(tasks.getByRole("link", { name: /Build a chart/ })).toHaveAttribute(
    "href",
    /\/guide\/getting-started$/,
  );
  await expect(tasks.getByRole("link", { name: /Customize it/ })).toHaveAttribute(
    "href",
    /\/guide\/scales-guides$/,
  );
  await expect(tasks.getByRole("link", { name: /Add interaction/ })).toHaveAttribute(
    "href",
    /\/guide\/inspect-pin$/,
  );
  await expect(tasks.getByRole("link", { name: /Deploy it/ })).toHaveAttribute(
    "href",
    /\/guide\/responsive-charts$/,
  );
  await expect(tasks.getByRole("link", { name: /Troubleshoot it/ })).toHaveAttribute(
    "href",
    /\/guide\/errors$/,
  );

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
    "Build a chart",
  );
  await page.goto("/guide/getting-started?theme=light");
  await expect(page.locator(".lesson-source--file code")).toContainText(
    'import { GeomPoint, GGPlot } from "@ggsvelte/svelte"',
  );
  await expect(page.locator(".first-result .lesson-output")).toBeVisible();
  await expect(page.getByText("Map data fields to x and y", { exact: false })).toBeVisible();
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
    await expect(page.locator(".guide-code-classification").first()).toHaveText("Fragment");
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
  await expect(dialog.getByRole("link", { name: "Build a chart" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Build a chart" })).not.toHaveAttribute(
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
  await expect(dialog.getByRole("link", { name: "Troubleshoot it" })).toBeVisible();
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

for (const [name, width, height] of [
  ["desktop", 1280, 900],
  ["mobile", 375, 812],
] as const) {
  test(`Docs landing ${name} visual contract`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/docs?theme=light");
    await expect(page).toHaveScreenshot(`docs-landing-${name}.png`);
  });

  test(`Docs search ${name} visual contract`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/docs?theme=light");
    await page.getByRole("button", { name: "Search documentation" }).click();
    await page.getByRole("combobox", { name: "Search docs" }).fill("scale-scheme-type");
    await expect(page).toHaveScreenshot(`docs-search-${name}.png`);
  });

  test(`progressive lesson ${name} visual contract`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/guide/getting-started?theme=light");
    // Lesson contracts cover the progressive step only. Hide fixed chrome that can
    // overlay the element after scroll-into-view (site header + skip links, which
    // become visible when focused and sit at position:fixed top-left).
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur?.();
      for (const el of document.querySelectorAll<HTMLElement>(".site-header, .skip-link")) {
        el.style.visibility = "hidden";
      }
    });
    const step = page.locator(".progressive-step").nth(3);
    await expect(step).toHaveScreenshot(`docs-progressive-lesson-${name}.png`);
  });
}

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
