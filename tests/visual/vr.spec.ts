/**
 * VR matrix: every manifest example × [light, dark] (plan: "golden corpus
 * first — ~2 examples per geom × light/dark"). Generated from
 * examples/manifest.ts — adding an example to the corpus grows this matrix
 * with no test edits ("one source, three uses").
 *
 * Waits before every shot:
 * 1. html[data-theme] confirms the pre-paint theme script ran with our value
 * 2. document.fonts.ready (system-font stack resolves immediately; keeps the
 *    contract explicit for when a self-hosted font lands — decision 0009)
 * 3. [data-gg-ready="true"] — <GGPlot> flips it after hydration's first
 *    committed render flush
 */
import { expect, test } from "@playwright/test";

import { EXAMPLES } from "../../examples/manifest";
import { settleVisualState } from "./helpers/deterministic";

const THEMES = ["light", "dark"] as const;

for (const example of EXAMPLES) {
  for (const theme of THEMES) {
    test(`${example.id} — ${theme}`, async ({ page }) => {
      await page.goto(`/examples/${example.id}?vr&theme=${theme}`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await settleVisualState(page);
      await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
        `${example.category}-${example.name}-${theme}.png`,
      );
    });
  }
}

test("interaction inspection — pinned state", async ({ page }) => {
  await page.goto("/examples/interaction/tooltip?vr&theme=light");
  await settleVisualState(page);
  const mark = page.locator(".gg-points circle").first();
  const box = await mark.boundingBox();
  if (box === null) throw new Error("expected an inspectable point");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator(".gg-tooltip")).toBeVisible();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator(".event-status")).toContainText("Pinned");
  await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
    "interaction-tooltip-pinned-light.png",
  );
});

test("interaction interval — committed selection state", async ({ page }) => {
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
  await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
    "interaction-interval-selected-light.png",
  );
});

test("interaction area drafts — select fill and labelled zoom outline", async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 700 });
  await page.goto("/examples/interaction/brush-zoom?vr&theme=light");
  await settleVisualState(page);
  const capture = page.locator(".gg-capture");
  const box = await capture.boundingBox();
  if (box === null) throw new Error("expected an area capture surface");

  const selectArea = page.getByRole("button", { name: "Select area" });
  await selectArea.click();
  await expect(selectArea).toHaveAttribute("aria-pressed", "true");
  await capture.dispatchEvent("pointerdown", {
    clientX: box.x + box.width * 0.2,
    clientY: box.y + box.height * 0.25,
    pointerId: 11,
    button: 0,
    buttons: 1,
  });
  await capture.dispatchEvent("pointermove", {
    clientX: box.x + box.width * 0.62,
    clientY: box.y + box.height * 0.68,
    pointerId: 11,
    buttons: 1,
  });
  await expect(page.locator(".gg-area-draft-select")).toBeVisible();
  await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
    "interaction-select-draft-light.png",
  );
  await capture.dispatchEvent("pointercancel", { pointerId: 11 });

  const zoomArea = page.getByRole("button", { name: "Zoom area" });
  await zoomArea.click();
  await expect(zoomArea).toHaveAttribute("aria-pressed", "true");
  await capture.dispatchEvent("pointerdown", {
    clientX: box.x + box.width * 0.28,
    clientY: box.y + box.height * 0.3,
    pointerId: 12,
    button: 0,
    buttons: 1,
  });
  await capture.dispatchEvent("pointermove", {
    clientX: box.x + box.width * 0.72,
    clientY: box.y + box.height * 0.72,
    pointerId: 12,
    buttons: 1,
  });
  await expect(page.locator(".gg-area-draft-zoom")).toBeVisible();
  await expect(page.locator(".gg-zoom-label")).toHaveText("Zoom");
  await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
    "interaction-zoom-draft-light.png",
  );
  await capture.dispatchEvent("pointercancel", { pointerId: 12 });
});

test("interaction responsive — two-row rail and docked pinned tooltip", async ({ page }) => {
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
  await expect(page.getByRole("button", { name: "Clear selection" })).toBeVisible();
  const modes = await page.locator(".gg-tool-modes").boundingBox();
  const recovery = await page.locator(".gg-tool-recovery-actions").boundingBox();
  if (modes === null || recovery === null) throw new Error("expected deterministic tool rows");
  expect(recovery.y).toBeGreaterThan(modes.y);
  const selectionStatus = await page.locator(".event-status").boundingBox();
  const selectionFrame = await page.locator(".gg-example-frame").boundingBox();
  if (selectionStatus === null || selectionFrame === null)
    throw new Error("expected visible selection status and frame");
  expect(selectionStatus.y + selectionStatus.height).toBeLessThanOrEqual(
    selectionFrame.y + selectionFrame.height,
  );
  await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
    "interaction-tool-rail-460-light.png",
  );

  await page.goto("/examples/interaction/tooltip?vr&theme=light");
  await settleVisualState(page);
  await page.locator(".gg-example-frame").evaluate((element) => {
    (element as HTMLElement).style.setProperty("width", "440px", "important");
  });
  await expect(page.locator("svg.gg-plot").first()).toHaveAttribute("width", "440");
  const mark = page.locator(".gg-points circle").first();
  const box = await mark.boundingBox();
  if (box === null) throw new Error("expected an inspectable point");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator(".gg-tooltip-docked")).toBeVisible();
  const tooltip = await page.locator(".gg-tooltip-docked").boundingBox();
  const tooltipStatus = await page.locator(".event-status").boundingBox();
  const tooltipFrame = await page.locator(".gg-example-frame").boundingBox();
  if (tooltip === null || tooltipStatus === null || tooltipFrame === null)
    throw new Error("expected complete docked tooltip evidence");
  expect(tooltip.height).toBeGreaterThan(48);
  const finalTooltipValue = await page.locator(".gg-tooltip dd").last().boundingBox();
  if (finalTooltipValue === null) throw new Error("expected docked tooltip values");
  expect(finalTooltipValue.y + finalTooltipValue.height).toBeLessThanOrEqual(
    tooltip.y + tooltip.height,
  );
  const frameBottom = tooltipFrame.y + tooltipFrame.height;
  expect(tooltip.y + tooltip.height).toBeLessThanOrEqual(frameBottom);
  expect(tooltipStatus.y + tooltipStatus.height).toBeLessThanOrEqual(frameBottom);
  await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
    "interaction-tooltip-docked-460-light.png",
  );
});

test("interaction forced colors preserves non-color distinctions", async ({ page }) => {
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
  const systemColors = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "CanvasText";
    probe.style.backgroundColor = "Canvas";
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const colors = { text: style.color, canvas: style.backgroundColor };
    probe.remove();
    return colors;
  });
  const titleFill = await page
    .locator(".gg-title")
    .evaluate((element) => getComputedStyle(element).fill);
  const tickFill = await page
    .locator(".gg-tick text")
    .first()
    .evaluate((element) => getComputedStyle(element).fill);
  const legendFill = await page
    .locator(".gg-legend-label")
    .first()
    .evaluate((element) => getComputedStyle(element).fill);
  const paperFill = await page
    .locator(".gg-paper")
    .evaluate((element) => getComputedStyle(element).fill);
  expect(titleFill).toBe(systemColors.text);
  expect(tickFill).toBe(systemColors.text);
  expect(legendFill).toBe(systemColors.text);
  expect(paperFill).toBe(systemColors.canvas);
  await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
    "interaction-zoom-draft-forced-colors.png",
  );
  await capture.dispatchEvent("pointercancel", { pointerId: 13 });
});

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

test("interaction reduced motion — dense grouped zoom and visible reset", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/examples/interaction/brush-zoom?vr&theme=light");
  await settleVisualState(page);
  const root = page.locator(".gg-plot-root");
  await expect(root).toHaveCSS("scroll-behavior", "auto");
  const motion = await root.evaluate((element) => {
    const descendants = [element, ...element.querySelectorAll("*")];
    return descendants.map((node) => {
      const style = getComputedStyle(node);
      return {
        animation: style.animationName,
        transition: style.transitionDuration,
      };
    });
  });
  expect(motion.every((value) => value.animation === "none")).toBe(true);
  expect(
    motion.every((value) =>
      value.transition.split(",").every((duration) => duration.trim() === "0s"),
    ),
  ).toBe(true);

  const zoom = page.getByRole("button", { name: "Zoom area" });
  await zoom.click();
  const capture = page.locator(".gg-capture");
  const box = await capture.boundingBox();
  if (box === null) throw new Error("expected a zoom capture surface");
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75);
  await page.mouse.up();
  const reset = page.getByRole("button", { name: "Reset zoom" });
  await expect(reset).toBeVisible();
  await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
    "interaction-dense-grouped-zoomed-reduced-motion.png",
  );

  await reset.click();
  await expect(reset).toBeHidden();
  await expect(page.locator(".event-status")).toContainText("Zoom reset");
  await expect(page.locator(".gg-example-frame")).toHaveScreenshot(
    "interaction-dense-grouped-reset-reduced-motion.png",
  );
});
