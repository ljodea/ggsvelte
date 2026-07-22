import { resolveTheme, type SceneDiscreteLegend } from "@ggsvelte/core";
import { describe, expect, it } from "vitest";

import Legend from "../../src/lib/scene/Legend.svelte";
import { render } from "../helpers/render.js";

const theme = resolveTheme({ name: "light" });

describe("Legend scene rendering", () => {
  it("renders wrapped discrete labels as measured tspans", () => {
    const legend: SceneDiscreteLegend = {
      type: "discrete",
      scale: "color",
      title: "Group",
      position: "bottom",
      direction: "horizontal",
      x: 0,
      y: 0,
      width: 160,
      height: 72,
      swatchSize: 10,
      entries: [
        {
          value: "long",
          label: "A long category label",
          fullLabel: "A long category label",
          lines: ["A long", "category label"],
          lineHeight: 13,
          color: "#123456",
          x: 0,
          y: 18,
          height: 32,
        },
      ],
    };
    const { container } = render(Legend, { legend, theme });
    const tspans = container.querySelectorAll(".gg-legend-label tspan");
    expect(tspans).toHaveLength(2);
    expect(Array.from(tspans, (node) => node.textContent)).toEqual(["A long", "category label"]);
    expect(tspans.item(1)?.getAttribute("dy")).toBe("13");
  });
});
