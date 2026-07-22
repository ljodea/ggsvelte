import { describe, expect, it } from "vitest";

import ColorBinnedExample from "../../../../examples/color/binned/Example.svelte";
import { render } from "../helpers/render.js";
import { until } from "../helpers/until.js";

describe("binned color example", () => {
  it("commits one bounded chart instead of entering a reactive render loop", async () => {
    const { container } = render(ColorBinnedExample, {});
    await until(
      () => container.querySelector<HTMLElement>(".gg-plot-root")?.dataset.ggReady === "true",
    );
    expect(container.querySelectorAll(".gg-legend-step")).toHaveLength(4);
    expect(container.querySelector(".gg-legend-bottom.gg-legend-horizontal")).not.toBeNull();
    expect(container.querySelector(".gg-title")?.textContent).toBe("Particle pollution by hour");
  });
});
