/**
 * Enforced VR smoke suite — scenarios from smoke-matrix.ts only.
 * Full dual-theme × every example is intentionally gone; gallery lights live
 * under apps/docs/static/previews and may lag the renderer.
 */
import { expect, test, type Page } from "@playwright/test";

import { settleVisualState } from "./helpers/deterministic";
import {
  SMOKE_SCENARIOS,
  type InteractionHandlerId,
  type InteractionSmokeScenario,
} from "./smoke-matrix";

const EXPECTED_PLOTS: Readonly<Record<string, number>> = {
  "interaction/linked-views": 2,
  "interaction/legend-focus": 3,
};

async function shotExample(
  page: Page,
  exampleId: string,
  theme: "light" | "dark",
  basename: string,
): Promise<void> {
  await page.goto(`/examples/${exampleId}?vr&theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await settleVisualState(page, EXPECTED_PLOTS[exampleId] ?? 1);
  await expect(page.locator(".gg-example-frame")).toHaveScreenshot(basename);
}

const INTERACTION_HANDLERS: Record<
  InteractionHandlerId,
  (page: Page, scenario: InteractionSmokeScenario) => Promise<void>
> = {
  async "tooltip-pinned"(page, scenario) {
    await page.goto("/examples/interaction/tooltip?vr&theme=light");
    await settleVisualState(page);
    const mark = page.locator(".gg-points circle").first();
    const box = await mark.boundingBox();
    if (box === null) throw new Error("expected an inspectable point");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator(".gg-tooltip")).toBeVisible();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator(".event-status")).toContainText("Pinned");
    await expect(page.locator(".gg-example-frame")).toHaveScreenshot(scenario.basename);
  },

  async "legend-focus-committed"(page, scenario) {
    await page.goto("/examples/interaction/legend-focus?vr&theme=light");
    await settleVisualState(page, 3);
    const firstLegendEntry = page.locator(".gg-legend-target").first();
    await firstLegendEntry.click();
    await expect(firstLegendEntry).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("3 rows focused")).toBeVisible();
    await expect(page.getByRole("status")).toContainText("pinned across three views");
    await expect(page.locator("[data-gg-focused='true']")).toHaveCount(7);
    await expect(page.locator(".gg-example-frame")).toHaveScreenshot(scenario.basename);
  },

  async "interval-selected"(page, scenario) {
    await page.goto("/examples/interaction/brush-zoom?vr&theme=light");
    await settleVisualState(page);
    const selectArea = page.getByRole("button", { name: "Select area" });
    await selectArea.click();
    await expect(selectArea).toHaveAttribute("aria-pressed", "true");
    const capture = page.locator(".gg-capture");
    const box = await capture.boundingBox();
    if (box === null) throw new Error("expected an interval capture surface");
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.75);
    await page.mouse.up();
    await expect(page.locator(".gg-selection")).toBeVisible();
    await expect(page.locator(".gg-example-frame")).toHaveScreenshot(scenario.basename);
  },

  async "tool-rail"(page, scenario) {
    await page.setViewportSize({ width: 460, height: 820 });
    await page.goto("/examples/interaction/brush-zoom?vr&theme=light");
    await settleVisualState(page);
    await page.locator(".gg-example-frame").evaluate((element) => {
      (element as HTMLElement).style.setProperty("width", "440px", "important");
    });
    await expect(page.locator(".gg-plot-root")).toHaveClass(/gg-narrow-tools/);
    await expect(page.locator("svg.gg-plot").first()).toHaveAttribute("width", "440");
    const rail = page.locator(".gg-tool-rail");
    await expect(rail).toBeVisible();
    await page.getByRole("button", { name: "Select area" }).click();
    const capture = page.locator(".gg-capture");
    const captureBox = await capture.boundingBox();
    if (captureBox === null) throw new Error("expected an interval capture surface");
    await page.mouse.move(captureBox.x + 80, captureBox.y + 80);
    await page.mouse.down();
    await page.mouse.move(captureBox.x + 180, captureBox.y + 180);
    await page.mouse.up();
    await expect(page.getByRole("button", { name: "Clear all selections" })).toBeVisible();
    await expect(page.locator(".gg-example-frame")).toHaveScreenshot(scenario.basename);
  },

  async "dark-tooltip"(page, scenario) {
    await page.goto("/examples/interaction/tooltip?vr&theme=dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await settleVisualState(page);
    await expect(page.locator(".gg-example-frame")).toHaveScreenshot(scenario.basename);
  },

  async "forced-colors"(page, scenario) {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/examples/interaction/brush-zoom?vr&theme=light");
    await settleVisualState(page);
    const zoomArea = page.getByRole("button", { name: "Zoom area" });
    await zoomArea.click();
    await expect(zoomArea).toHaveAttribute("aria-pressed", "true");
    const capture = page.locator(".gg-capture");
    const box = await capture.boundingBox();
    if (box === null) throw new Error("expected an area capture surface");
    await capture.dispatchEvent("pointerdown", {
      clientX: box.x + box.width * 0.25,
      clientY: box.y + box.height * 0.25,
      pointerId: 13,
      button: 0,
      buttons: 1,
    });
    await capture.dispatchEvent("pointermove", {
      clientX: box.x + box.width * 0.7,
      clientY: box.y + box.height * 0.7,
      pointerId: 13,
      buttons: 1,
    });
    await expect(page.locator(".gg-area-draft-zoom")).toBeVisible();
    await expect(page.locator(".gg-zoom-label")).toBeVisible();
    await expect(page.locator(".gg-example-frame")).toHaveScreenshot(scenario.basename);
    await capture.dispatchEvent("pointercancel", { pointerId: 13 });
  },
};

for (const scenario of SMOKE_SCENARIOS) {
  if (scenario.kind === "example") {
    test(`${scenario.exampleId} — ${scenario.theme}`, async ({ page }) => {
      // 10k-mark canvas specimen hydrates a large client bundle + paints on the
      // main thread; under CI load this regularly exceeds the default 30s budget
      // before data-gg-ready flips (and before Playwright can even query the DOM).
      if (scenario.exampleId === "point/canvas-scatter") {
        test.setTimeout(120_000);
      }
      await shotExample(page, scenario.exampleId, scenario.theme, scenario.basename);
    });
    continue;
  }
  const handler = INTERACTION_HANDLERS[scenario.handler];
  test(`interaction — ${scenario.handler}`, async ({ page }) => {
    await handler(page, scenario);
  });
}

// Non-pixel interaction behavior retained without a golden.
test("interaction inspect mode preserves real page scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 420 });
  await page.goto("/examples/interaction/tooltip?vr&theme=light");
  await settleVisualState(page);
  await page.evaluate(() => {
    document.body.style.minHeight = "2000px";
  });
  const capture = page.locator(".gg-capture");
  await expect(capture).toHaveCSS("touch-action", /pan-y/);
  const box = await capture.boundingBox();
  if (box === null) throw new Error("expected an inspection capture surface");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});
