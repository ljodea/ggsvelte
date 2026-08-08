import { describe, expect, it } from "vitest";

import LegendFilterMultiSeriesPlot from "../fixtures/LegendFilterMultiSeriesPlot.svelte";
import { render } from "../helpers/render.js";
import { until } from "../helpers/until.js";

/**
 * Regression: controlled legend-filter checkboxes must mirror exclude state.
 * Production bug: trusted label clicks left input.checked stuck true while
 * the series was hidden — Svelte's set_checked caches the last write, and
 * the UA can mutate the property after the reactive flush.
 */
describe("legend-filter checkbox visible state", () => {
  it("unchecks after a label chip click", async () => {
    const { container } = render(LegendFilterMultiSeriesPlot);
    await until(() => container.querySelectorAll(".gg-legend-filters input").length === 3);

    const debt = container.querySelector<HTMLInputElement>(
      "input[aria-label='Show National debt']",
    )!;
    const label = debt.closest("label")!;
    expect(debt.checked).toBe(true);

    label.click();

    await until(
      () =>
        container.querySelector("button[aria-label='Reset legend filters']") !== null &&
        debt.checked === false,
    );

    expect(debt.checked).toBe(false);
  });

  it("re-syncs when the UA overwrites checked after a successful filter", async () => {
    const { container } = render(LegendFilterMultiSeriesPlot);
    await until(() => container.querySelectorAll(".gg-legend-filters input").length === 3);

    const debt = container.querySelector<HTMLInputElement>(
      "input[aria-label='Show National debt']",
    )!;
    debt.click();
    await until(
      () =>
        container.querySelector("button[aria-label='Reset legend filters']") !== null &&
        debt.checked === false,
    );

    // Simulate the production race: UA sets checked back to true after
    // Svelte's set_checked(false) and after the first rAF. The click-path
    // double-rAF (and entry $effect) must win.
    debt.checked = true;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    // Click again is not required — force another controller-driven apply by
    // toggling a different series (entries re-derive; $effect re-syncs all).
    const revenue = container.querySelector<HTMLInputElement>("input[aria-label='Show Revenue']")!;
    revenue.click();
    await until(() => debt.checked === false && revenue.checked === false);

    expect(debt.checked).toBe(false);
    expect(revenue.checked).toBe(false);
  });
});
