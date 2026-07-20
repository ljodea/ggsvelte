import { expect, test } from "@playwright/test";

async function expectNoOverflow(page: import("@playwright/test").Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test("homepage first viewport leads with a live chart and two actions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?theme=light");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Build charts that explain themselves.",
  );
  await expect(page.locator(".home-hero .gg-plot-root")).toBeVisible();
  await expect(page.getByRole("link", { name: "Build your first chart" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse the gallery" })).toBeVisible();
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
      value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) },
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

test("gallery exposes six jobs and all 31 generated previews", async ({ page }) => {
  await page.goto("/examples");
  await expect(page.locator(".featured-gallery li")).toHaveCount(6);
  await expect(page.locator(".example-grid li")).toHaveCount(31);
  await expect(page.locator('img[src*="/previews/"]')).toHaveCount(37);
  await expect(page.getByText("31 of 31")).toBeVisible();
});

test("gallery filtering is URL-addressable, preserves theme, and restores history", async ({
  page,
}) => {
  await page.goto("/examples?theme=dark");
  const search = page.getByRole("searchbox", { name: "Filter examples" });
  await search.fill("ordinary ui");
  await expect(page).toHaveURL(/theme=dark.*q=ordinary\+ui|q=ordinary\+ui.*theme=dark/);
  await expect(page.locator(".example-grid li")).toHaveCount(1);
  await page.getByLabel("Chart family").selectOption("bar");
  await expect(page).toHaveURL(/category=bar/);
  await expect(page.getByText("0 of 31")).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Chart family")).toHaveValue("");
  await expect(page.locator(".example-grid li")).toHaveCount(1);
});

test("unknown gallery filter values reset without dropping unrelated params", async ({ page }) => {
  await page.goto("/examples?theme=dark&category=unknown&tag=nope");
  await expect(page.getByText("Some unsupported filters were reset.")).toBeVisible();
  await expect(page).toHaveURL(/theme=dark/);
  await expect(page).not.toHaveURL(/category=unknown|tag=nope/);
});

test("detail is specimen-first and always orders Svelte, builder, then JSON", async ({ page }) => {
  await page.goto("/examples/point/scatter-color");
  await expect(page.locator(".gg-example-frame")).toBeVisible();
  const tabs = page.getByRole("tablist", { name: "Code representations" }).getByRole("tab");
  await expect(tabs).toHaveText(["Svelte", "Builder (TS)", "Spec (JSON)"]);
  await expect(page.getByRole("link", { name: "Open this example in Playground" })).toHaveAttribute(
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

for (const [name, route, width, height] of [
  ["home-desktop", "/?theme=light", 1280, 900],
  ["home-mobile", "/?theme=light", 375, 812],
  ["gallery-desktop", "/examples?theme=light", 1280, 900],
  ["gallery-mobile", "/examples?theme=light", 375, 812],
  ["detail-desktop", "/examples/point/scatter-color?theme=light", 1280, 900],
] as const) {
  test(`${name} visual contract`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(route);
    await expect(page).toHaveScreenshot(`docs-${name}.png`);
  });
}
