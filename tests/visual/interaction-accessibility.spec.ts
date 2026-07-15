import { expect, test } from "@playwright/test";
import axe from "axe-core";

import { settleVisualState } from "./helpers/deterministic";

for (const route of [
  "/examples/interactions/inspection",
  "/examples/interactions/interval-selection",
]) {
  test(`${route} has no automated accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await settleVisualState(page);
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(async () => {
      const runner = (globalThis as typeof globalThis & { axe: typeof axe }).axe;
      return (await runner.run(document.querySelector(".example-page")!)).violations.map(
        ({ id, impact, nodes }) => ({
          id,
          impact,
          targets: nodes.map((node) => node.target.join(" ")),
        }),
      );
    });
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}

test("inspection example supports its documented keyboard journey", async ({ page }) => {
  await page.goto("/examples/interactions/inspection");
  await settleVisualState(page);
  const surface = page.locator(".gg-capture");
  await surface.focus();
  await surface.press("ArrowRight");
  await expect(page.locator(".gg-tooltip")).toBeVisible();
  await surface.press("Enter");
  await expect(page.locator(".event-status")).toContainText("Pinned");
  await surface.press("Escape");
  await expect(page.locator(".gg-tooltip")).toHaveCount(0);
});

test("interval example supports the two-tap touch journey", async ({ page }) => {
  await page.goto("/examples/interactions/interval-selection");
  await settleVisualState(page);
  await page.getByRole("button", { name: "Select area" }).click();
  const capture = page.locator(".gg-capture");
  const box = await capture.boundingBox();
  if (box === null) throw new Error("expected an interval capture surface");
  for (const [index, [x, y]] of [
    [box.x + box.width * 0.25, box.y + box.height * 0.3],
    [box.x + box.width * 0.7, box.y + box.height * 0.75],
  ].entries()) {
    const pointerId = 70 + index;
    await capture.dispatchEvent("pointerdown", {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: y,
      pointerId,
      pointerType: "touch",
    });
    await capture.dispatchEvent("pointerup", {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: y,
      pointerId,
      pointerType: "touch",
    });
  }
  await expect(page.locator(".gg-selection")).toBeVisible();
  await expect(page.locator(".event-status")).toContainText("end:");
});
