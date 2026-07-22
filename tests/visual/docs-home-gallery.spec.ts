import { expect, test } from "@playwright/test";

async function expectNoOverflow(page: import("@playwright/test").Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test("homepage first viewport leads with a live chart and two actions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?theme=light");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ggplot2 for Svelte.");
  await expect(page.locator(".home-hero .gg-plot-root")).toBeVisible();
  await expect(page.getByRole("link", { name: "Getting started" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Examples" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy install" })).toBeVisible();
  await expectNoOverflow(page);
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
  const status = page.locator(".home-hero .event-status");
  const initialStatus = await status.textContent();
  const capture = page.locator(".home-hero .gg-capture");
  await capture.focus();
  await capture.press("ArrowRight");
  await expect(page.locator(".home-hero .gg-tooltip")).toBeVisible();
  await expect(status).not.toHaveText(initialStatus ?? "");
});

test("homepage grammar steps change real chart structure in place", async ({ page }) => {
  await page.goto("/");
  const output = page.locator(".grammar-output");
  await expect(output.locator(".gg-points")).toHaveCount(1);
  await expect(output.locator(".gg-legend")).toHaveCount(0);

  await page.getByRole("button", { name: /Mappings/ }).click();
  await expect(output.locator(".gg-legend")).toHaveCount(1);
  await expect(output.locator(".grammar-status")).toHaveText("Step 2: Mappings");

  await page.getByRole("button", { name: /Layers/ }).click();
  await expect(output.locator(".gg-paths")).toHaveCount(1);
  await expect(output.locator(".grammar-status")).toHaveText("Step 3: Layers");

  await page.getByRole("button", { name: /Interaction/ }).click();
  await expect(output.locator(".gg-capture")).toBeVisible();
  await expect(output.locator(".grammar-status")).toHaveText("Step 4: Interaction");
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
    "npm install @ggsvelte/svelte",
  );
  const tabs = page.getByRole("tablist", { name: "Code representations" }).getByRole("tab");
  await expect(tabs.first()).toHaveText("Svelte");
});

test("gallery exposes six featured previews and all generated previews", async ({ page }) => {
  await page.goto("/examples");
  await expect(page.locator(".featured-gallery li")).toHaveCount(6);
  // One meta.json per example under examples/ (grows when new specimens land).
  const exampleCount = 41; // +rect/tile/raster +ribbon +segment +fixed-aspect +layer-data-bands
  await expect(page.locator(".example-grid li")).toHaveCount(exampleCount);
  await expect(page.locator('img[src*="/previews/"]')).toHaveCount(6 + exampleCount);
  await expect(page.getByText(`${String(exampleCount)} of ${String(exampleCount)}`)).toBeVisible();
});

test("gallery filtering is URL-addressable, preserves theme, and restores history", async ({
  page,
}) => {
  await page.goto("/examples?theme=dark");
  const search = page.getByRole("searchbox", { name: "Filter" });
  await search.fill("linked");
  await expect(page).toHaveURL(/theme=dark.*q=linked|q=linked.*theme=dark/);
  await expect(page.locator(".example-grid li").first()).toBeVisible();
  const linkedCount = await page.locator(".example-grid li").count();
  expect(linkedCount).toBeGreaterThan(0);
  await page.getByLabel("Category").selectOption("bar");
  await expect(page).toHaveURL(/category=bar/);
  await expect(page.getByText(/of \d+/)).toBeVisible();
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
  await expect(page.getByRole("link", { name: "Open in Playground" })).toHaveAttribute(
    "href",
    /\/playground#play=v1\./,
  );
  await expect(page.locator(".related li")).toHaveCount(3);
});

for (const [path, height] of [
  ["point/scatter-color", 400],
  ["interaction/linked-views", 1140],
] as const) {
  test(`VR detail isolates ${path} at canonical geometry`, async ({ page }) => {
    await page.goto(`/examples/${path}?vr&theme=light`);
    await expect(page.locator(".example-prose:visible")).toHaveCount(0);
    const frame = page.locator(".gg-example-frame");
    await expect(frame).toBeVisible();
    await expect(frame).toHaveCSS("width", "640px");
    await expect(frame).toHaveCSS("height", `${String(height)}px`);
  });
}
