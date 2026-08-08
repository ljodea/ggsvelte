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
        !debt.checked,
    );

    expect(debt.checked).toBe(false);

    // Reset restores every box.
    container
      .querySelector<HTMLButtonElement>("button[aria-label='Reset legend filters']")!
      .click();
    await until(
      () =>
        container.querySelector("button[aria-label='Reset legend filters']") === null &&
        debt.checked,
    );
    expect(
      [...container.querySelectorAll<HTMLInputElement>(".gg-legend-filters input")].every(
        (input) => input.checked,
      ),
    ).toBe(true);
  });
});
