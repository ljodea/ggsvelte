import { expect, test } from "@playwright/test";
import axe from "axe-core";

import { settleVisualState } from "./helpers/deterministic";

for (const route of [
  "/examples/interactions/inspection",
  "/examples/interactions/interval-selection",
  "/examples/interaction/linked-views",
]) {
  test(`${route} has no automated accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await settleVisualState(page, route.endsWith("linked-views") ? 2 : 1);
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

test("linked views share external selection and emphasis without callback loops", async ({
  page,
}) => {
  await page.goto("/examples/interaction/linked-views");
  await settleVisualState(page, 2);

  await page.getByRole("button", { name: "Select Gentoo" }).click();
  await expect(page.locator("tbody tr[aria-selected='true']")).toHaveCount(4);
  await expect(page.locator(".gg-selected-ring")).toHaveCount(8);

  const emphasis = page.getByRole("button", { name: "Emphasize Adelie 2" });
  await emphasis.click();
  await expect(emphasis).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".gg-emphasized-ring")).toHaveCount(2);

  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.locator("tbody tr[aria-selected='true']")).toHaveCount(0);
  await expect(page.locator(".gg-selected-ring")).toHaveCount(0);
  await expect(page.locator(".gg-emphasized-ring")).toHaveCount(0);
});

test("inspection example supports its documented keyboard journey", async ({ page }) => {
  await page.goto("/examples/interactions/inspection");
  await settleVisualState(page);
  const surface = page.locator(".gg-capture");
  await surface.focus();
  await surface.press("ArrowRight");
  await expect(page.locator(".gg-tooltip")).toBeVisible();
  await expect(page.locator("[aria-live='polite']")).toHaveCount(1);
  await surface.press("Enter");
  await expect(page.locator(".event-status")).toContainText("Pinned");
  await surface.press("Escape");
  await expect(page.locator(".gg-tooltip")).toHaveCount(0);
});

test("interval example supports the two-tap touch journey", async ({ page }) => {
  await page.goto("/examples/interactions/interval-selection");
  await settleVisualState(page);
  await expect(page.locator("[aria-live='polite']")).toHaveCount(1);
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
