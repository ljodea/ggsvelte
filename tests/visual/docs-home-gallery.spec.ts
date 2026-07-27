import { expect, test } from "@playwright/test";

import {
  GALLERY_FILTER_JOURNEY_CATEGORY,
  GALLERY_FILTER_JOURNEY_QUERY,
} from "../../apps/docs/src/lib/gallery-filter-journey";

async function expectNoOverflow(page: import("@playwright/test").Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test("homepage first viewport leads with a live chart and two actions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?theme=light");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A layered grammar of graphics implemented for agents",
  );
  await expect(page.locator(".home-hero .gg-plot-root")).toBeVisible();
  await expect(page.getByRole("link", { name: "Getting started" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Examples" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy install" })).toBeVisible();
  await expectNoOverflow(page);
});

/**
 * Narrow-ish desktop (below the wide side-by-side breakpoint): the hero chart
 * is the product, so it owns a full-width row instead of sharing a horizontal
 * plane with the claim. Also: the hero must size to content — a viewport-tall
 * min-height stretched a two-row grid and left a multi-hundred-px void between
 * claim and install.
 */
test("homepage mid-width stacks the hero chart full-width without empty void", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto("/?theme=light");
  const metrics = await page.locator(".home-hero").evaluate((hero) => {
    const claim = hero.querySelector(".hero-claim")!.getBoundingClientRect();
    const plot = hero.querySelector(".hero-plot")!.getBoundingClientRect();
    const actions = hero.querySelector(".hero-actions")!.getBoundingClientRect();
    const box = hero.getBoundingClientRect();
    return {
      claimBottom: claim.bottom,
      claimLeft: claim.left,
      plotTop: plot.top,
      plotLeft: plot.left,
      plotWidth: plot.width,
      actionsTop: actions.top,
      heroWidth: box.width,
      gapAfterPlot: actions.top - plot.bottom,
    };
  });
  // Chart sits below the claim on its own horizontal plane.
  expect(metrics.plotTop).toBeGreaterThan(metrics.claimBottom - 1);
  expect(Math.abs(metrics.plotLeft - metrics.claimLeft)).toBeLessThan(24);
  expect(metrics.plotWidth / metrics.heroWidth).toBeGreaterThan(0.9);
  // Install follows the chart tightly — no viewport-filling void.
  // (Hero height itself can exceed the viewport when claim + 400px plot stack;
  // the failure mode was empty space between plot and actions, not total height.)
  expect(metrics.gapAfterPlot).toBeLessThan(64);
});

/** Wide layout may share a row with claim, but must not invent empty vertical space. */
test("homepage wide layout keeps install adjacent to claim without hero void", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?theme=light");
  const metrics = await page.locator(".home-hero").evaluate((hero) => {
    const claim = hero.querySelector(".hero-claim")!.getBoundingClientRect();
    const actions = hero.querySelector(".hero-actions")!.getBoundingClientRect();
    return {
      claimBottom: claim.bottom,
      actionsTop: actions.top,
      gapClaimToActions: actions.top - claim.bottom,
    };
  });
  // claim → actions is a short stack on the left; no 100svh stretch between them.
  expect(metrics.gapClaimToActions).toBeLessThan(96);
  expect(metrics.actionsTop).toBeGreaterThan(metrics.claimBottom - 1);
});

test("homepage preserves SSR chart output and hydrates its keyboard interaction", async ({
  page,
  request,
}) => {
  const response = await request.get("/");
  expect(await response.text()).toContain('data-gg-ready="false"');

  await page.goto("/");
  const plot = page.locator(".home-hero .gg-plot-root");
  await expect(plot).toHaveAttribute("data-gg-ready", "true");
  const capture = page.locator(".home-hero .gg-capture");
  await capture.focus();
  await capture.press("ArrowRight");
  await expect(page.locator(".home-hero .gg-tooltip")).toBeVisible();
});

/**
 * Hero tooltip contract: one department at a time, named identity, no vertical
 * axis guide, no raw camelCase wall of multi-member x-group rows.
 */
test("homepage hero tooltip names a single department without axis crosshair noise", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?theme=light");
  const plot = page.locator(".home-hero .gg-plot-root");
  await expect(plot).toHaveAttribute("data-gg-ready", "true");

  const hero = page.locator(".home-hero");
  // Axis titles use real units (not the old mistaken "rank" labels).
  // Scope to the plot so code-tab JSON string literals don't match.
  await expect(
    hero.locator(".gg-axis-title", { hasText: "Literate conscripts (%)" }),
  ).toBeVisible();
  await expect(
    hero.locator(".gg-axis-title", {
      hasText: "Population per crime against persons",
    }),
  ).toBeVisible();

  // Readable tick size floor (light/dark themes were 8.8px on several presets).
  const axisFontSize = await hero
    .locator(".gg-axis .gg-tick text")
    .first()
    .evaluate((el) => Number(el.getAttribute("font-size") ?? "0"));
  expect(axisFontSize).toBeGreaterThanOrEqual(11);

  const capture = hero.locator(".gg-capture");
  await capture.focus();
  await capture.press("ArrowRight");
  const tooltip = hero.locator(".gg-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator(".hero-tooltip-title")).toBeVisible();
  await expect(tooltip.getByText("pop. per crime")).toBeVisible();
  await expect(tooltip.getByText("crimePersons")).toHaveCount(0);
  // Exact mode: no full-panel vertical/horizontal crosshair guides.
  await expect(hero.locator(".gg-crosshair")).toHaveCount(0);
  // Single focus member — not an x-group stack of departments.
  await expect(tooltip.locator(".hero-tooltip")).toHaveCount(1);
});

test("homepage grammar steps change real chart structure in place", async ({ page }) => {
  await page.goto("/");
  const output = page.locator(".grammar-output");
  // The demo opens on the last step: layers, legend, and inspection all live.
  await expect(output.locator(".gg-points")).toHaveCount(1);
  await expect(output.locator(".gg-legend")).toHaveCount(1);
  await expect(output.locator(".gg-paths")).toHaveCount(1);
  await expect(output.locator(".gg-capture")).toBeVisible();

  await page.getByRole("button", { name: /Data/ }).click();
  await expect(output.locator(".gg-legend")).toHaveCount(0);
  await expect(output.locator(".gg-paths")).toHaveCount(0);

  await page.getByRole("button", { name: /Mappings/ }).click();
  await expect(output.locator(".gg-legend")).toHaveCount(1);
  await expect(output.locator(".gg-paths")).toHaveCount(0);

  await page.getByRole("button", { name: /Layers/ }).click();
  await expect(output.locator(".gg-paths")).toHaveCount(1);
});

test("homepage grammar inspect is exact: point tooltip, no path x-crosshair", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?theme=dark");
  const output = page.locator(".grammar-output");
  await expect(output.locator(".gg-plot-root")).toHaveAttribute("data-gg-ready", "true");
  // Step 4 (Interaction) is the default open step.
  await expect(output.locator(".gg-capture")).toBeVisible();

  const capture = output.locator(".gg-capture");
  await capture.focus();
  await capture.press("ArrowRight");
  const tooltip = output.locator(".gg-tooltip");
  await expect(tooltip).toBeVisible();
  // Species is carried on identity points; blank "-" means we hit the smooth
  // path under auto mode "x" instead of a point.
  await expect(tooltip.getByText("species")).toBeVisible();
  await expect(tooltip.getByText("-")).toHaveCount(0);
  // Exact mode: no full-panel vertical guide from path auto-mode "x".
  await expect(output.locator(".gg-crosshair")).toHaveCount(0);
});

test("homepage mobile order is claim, specimen, then install", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/?theme=light");
  const order = await page.locator(".home-hero > div").evaluateAll((nodes) =>
    nodes.map((node) => ({
      classes: [...node.classList],
      top: node.getBoundingClientRect().top,
    })),
  );
  const topFor = (className: string): number => {
    const item = order.find((candidate) => candidate.classes.includes(className));
    expect(item, `${className} is present`).toBeDefined();
    return item?.top ?? Number.POSITIVE_INFINITY;
  };
  expect(topFor("hero-claim")).toBeLessThan(topFor("hero-plot"));
  expect(topFor("hero-plot")).toBeLessThan(topFor("hero-actions"));
  await expectNoOverflow(page);
});

test("install copy and code tabs share the manual-copy fallback", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")),
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Copy install" }).click();
  await expect(page.locator(".hero-actions [role=status]")).toHaveText(
    "Clipboard unavailable. Code selected for manual copy.",
  );
  expect(await page.evaluate(() => getSelection()?.toString())).toContain(
    "bun add @ggsvelte/svelte",
  );
  const tabs = page.getByRole("tablist", { name: "Code representations" }).getByRole("tab");
  await expect(tabs.first()).toHaveText("Svelte");
});

test("gallery exposes every generated preview exactly once", async ({ page }) => {
  await page.goto("/examples");
  // One meta.json per example under examples/ (grows when new specimens land).
  // 78 previews − 3 interaction expositions; + point/abline-identity (#790),
  // step/ecdf (#789), point/steps-binned (#827), hex/basic (#800), and qq/normal (#804).
  const exampleCount = 75;
  await expect(page.locator(".example-grid li")).toHaveCount(exampleCount);
  await expect(page.locator('img[src*="/previews/"]')).toHaveCount(exampleCount);
});

test("gallery filtering is URL-addressable, preserves theme, and restores history", async ({
  page,
}) => {
  await page.goto("/examples?theme=dark");
  const search = page.getByRole("searchbox", { name: "Filter" });
  // Shared with scripts/gallery.test.ts — must hit haystack (id/title/tags/section).
  // Chart Labs copy and deleted meta descriptions are not indexed (#765/#773).
  await search.fill(GALLERY_FILTER_JOURNEY_QUERY);
  const q = GALLERY_FILTER_JOURNEY_QUERY;
  await expect(page).toHaveURL(new RegExp(`theme=dark.*q=${q}|q=${q}.*theme=dark`));
  await expect(page.locator(".example-grid li").first()).toBeVisible();
  const linkedCount = await page.locator(".example-grid li").count();
  expect(linkedCount).toBeGreaterThan(0);
  await page.getByLabel("Category").selectOption(GALLERY_FILTER_JOURNEY_CATEGORY);
  await expect(page).toHaveURL(new RegExp(`category=${GALLERY_FILTER_JOURNEY_CATEGORY}`));
  await page.goBack();
  await expect(page.getByLabel("Category")).toHaveValue("");
  await expect(page.locator(".example-grid li").first()).toBeVisible();
});

test("unknown gallery filter values reset without dropping unrelated params", async ({ page }) => {
  await page.goto("/examples?theme=dark&category=unknown&tag=nope");
  await expect(page.getByText("Unsupported filters were reset.")).toBeVisible();
  await expect(page).toHaveURL(/theme=dark/);
  await expect(page).not.toHaveURL(/category=unknown|tag=nope/);
});

test("detail is specimen-first and always orders Svelte, builder, then JSON", async ({ page }) => {
  await page.goto("/examples/point/scatter-color");
  await expect(page.locator(".gg-example-frame")).toBeVisible();
  const tabs = page.getByRole("tablist", { name: "Code representations" }).getByRole("tab");
  await expect(tabs).toHaveText(["Svelte", "Builder (TS)", "Spec (JSON)"]);
  await expect(page.getByRole("link", { name: "Open in Playground" })).toHaveCount(0);
  await expect(page.locator(".related li")).toHaveCount(3);
});

for (const [path, width, height] of [
  ["/examples/point/scatter-color", 640, 400],
  ["/interactions/linked-views", 640, 1140],
  ["/examples/interaction/legend-focus", 960, 320],
] as const) {
  test(`VR detail isolates ${path} at canonical geometry`, async ({ page }) => {
    await page.goto(`${path}?vr&theme=light`);
    // Under ?vr, page prose chrome is hidden; the frame stays measurable.
    await expect(page.locator(".example-prose:visible")).toHaveCount(0);
    const frame = page.locator(".gg-example-frame");
    await expect(frame).toBeVisible();
    await expect(frame).toHaveCSS("width", `${String(width)}px`);
    await expect(frame).toHaveCSS("height", `${String(height)}px`);
  });
}
