import { describe, expect, it } from "vitest";

import ColorBinnedExample from "../../../../examples/color/binned/Example.svelte";
import colorBinnedSpec from "../../../../examples/color/binned/spec.js";
import { render } from "../helpers/render.js";
import { until } from "../helpers/until.js";

describe("binned color example", () => {
  it("commits one bounded chart instead of entering a reactive render loop", async () => {
    const { container } = render(ColorBinnedExample, {});
    await until(
      () => container.querySelector<HTMLElement>(".gg-plot-root")?.dataset.ggReady === "true",
    );
    // Read the step count and title from the example's own spec: what this
    // proves is that the binned legend commits once, not that the example plots
    // any particular subject.
    const breaks = colorBinnedSpec.scales?.color?.breaks;
    if (breaks === undefined) {
      throw new Error("color/binned must declare scales.color.breaks");
    }
    const title = colorBinnedSpec.labs?.title;
    if (title === undefined) {
      throw new Error("color/binned must declare labs.title");
    }
    expect(container.querySelectorAll(".gg-legend-step")).toHaveLength(breaks.length - 1);
    expect(container.querySelector(".gg-legend-bottom.gg-legend-horizontal")).not.toBeNull();
    expect(container.querySelector(".gg-title")?.textContent).toBe(title);
  });
});
