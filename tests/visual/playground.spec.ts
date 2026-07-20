import { expect, test } from "@playwright/test";
import axe from "axe-core";

import { settleVisualState } from "./helpers/deterministic";

test("landing page makes the interactive and local-data paths obvious", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Inspect a live plot" })).toHaveAttribute(
    "href",
    /examples\/interactions\/inspection$/,
  );
  await page.getByRole("link", { name: "Use my data" }).click();
  await expect(page).toHaveURL(/\/playground$/);
  await expect(page.getByRole("heading", { name: "Use my data" })).toBeVisible();
});

test("interaction reference filters the exact v0.1 contract", async ({ page }) => {
  await page.goto("/reference/interactions");
  await page.getByLabel("Search capabilities and events").fill("diagnostic");

  await expect(page.getByText("1 result")).toBeVisible();
  await expect(page.getByRole("link", { name: /Diagnostics/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Inspect and pin/ })).toHaveCount(0);
});

test("valid local JSON replaces the preview without network or code execution", async ({
  page,
}) => {
  const unexpectedRequests: string[] = [];
  const pageErrors: string[] = [];
  await page.goto("/playground");
  await settleVisualState(page);
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173")) unexpectedRequests.push(request.url());
  });

  await page.getByLabel("JSON rows").fill(
    JSON.stringify([
      { label: "<img src=x onerror=alert(1)>", x: 1, y: 4 },
      { label: "safe", x: 2, y: 9 },
    ]),
  );
  await page.getByRole("button", { name: "Apply data" }).click();

  await expect(page.getByText("Applied 2 local rows. Nothing was uploaded.")).toBeVisible();
  await expect(page.locator('.gg-plot-root[data-gg-ready="true"]')).toHaveCount(1);
  await expect(page.locator("img")).toHaveCount(0);
  expect(unexpectedRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("temporal samples render after clearing the optional color field", async ({ page }) => {
  await page.goto("/playground");
  await settleVisualState(page);

  await page.getByRole("button", { name: "ISO dates" }).click();

  await expect(page.getByText("ISO dates sample loaded. Nothing was uploaded.")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator('.gg-plot-root[data-gg-ready="true"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Axis plans" })).toBeVisible();
});

test("invalid data is actionable, takes focus, and preserves the last good chart", async ({
  page,
}) => {
  await page.goto("/playground");
  await settleVisualState(page);
  const originalCircles = await page.locator(".gg-points circle").count();

  await page.getByLabel("JSON rows").fill('[{"x":{"nested":true},"y":2}]');
  await page.getByRole("button", { name: "Apply data" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toBeFocused();
  await expect(alert).toContainText('field "x" must be a string, number, boolean, or null');
  await expect(alert).toContainText("Flatten nested values");
  await expect(alert).toContainText("last working preview is still shown");
  await expect(page.locator(".gg-points circle")).toHaveCount(originalCircles);
});

test("interaction is static by default and emits bounded semantic events after opt-in", async ({
  page,
}) => {
  await page.goto("/playground");
  await settleVisualState(page);
  await expect(page.locator(".gg-capture")).toHaveCount(0);

  await page.getByLabel("Inspect + pin").check();
  const capture = page.locator(".gg-capture");
  await expect(capture).toBeVisible();
  await capture.focus();
  await capture.press("ArrowRight");
  await expect(page.locator(".event-log li").first()).toContainText("inspect · change · keyboard");
  await expect(page.locator(".event-log li")).toHaveCount(1);
});

test("playground stays operable and axe-clean at a touch-size viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/playground");
  await settleVisualState(page);

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  for (const button of await page.getByRole("button").all()) {
    const box = await button.boundingBox();
    if (box !== null) expect(box.height).toBeGreaterThanOrEqual(44);
  }

  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const runner = (globalThis as typeof globalThis & { axe: typeof axe }).axe;
    return (await runner.run(document.querySelector(".playground")!)).violations.map(
      ({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target.join(" ")),
      }),
    );
  });
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});
