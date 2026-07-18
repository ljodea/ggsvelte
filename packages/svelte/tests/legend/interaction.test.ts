import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import type { SceneLegend, ThemeTokens } from "@ggsvelte/core";

import LegendHarness from "../fixtures/LegendHarness.svelte";
import { render } from "../helpers/render.js";

const theme = fromPartial<ThemeTokens>({});
const discrete = {
  type: "discrete",
  scale: "fill",
  title: "Channel",
  x: 10,
  y: 12,
  width: 124,
  height: 72,
  swatchSize: 12,
  entries: [
    { value: "web", label: "Web", color: "#123456", y: 18 },
    { value: "store", label: "Store", color: "#654321", y: 42 },
    { value: "partner", label: "Partner", color: "#abcdef", y: 66 },
  ],
} satisfies SceneLegend;

const ramp = {
  type: "ramp",
  scale: "color",
  title: "Score",
  x: 10,
  y: 12,
  width: 80,
  height: 120,
  rampWidth: 12,
  rampHeight: 80,
  stops: [
    [0, "#000"],
    [1, "#fff"],
  ],
  ticks: [
    { y: 0, label: "10" },
    { y: 80, label: "0" },
  ],
} satisfies SceneLegend;

describe("static Legend", () => {
  it("renders discrete SVG swatches and labels without an embedded HTML interaction tree", () => {
    const { container } = render(LegendHarness, { legend: discrete, theme });
    const legend = container.querySelector(".gg-legend-fill");
    expect(legend?.getAttribute("transform")).toBe("translate(10,12)");
    expect(legend?.querySelector(".gg-legend-title")?.textContent).toBe("Channel");
    expect(legend?.querySelectorAll(".gg-legend-swatch")).toHaveLength(3);
    expect(
      [...(legend?.querySelectorAll(".gg-legend-label") ?? [])].map((label) => label.textContent),
    ).toEqual(["Web", "Store", "Partner"]);
    expect(legend?.querySelector("foreignObject, button")).toBeNull();
  });

  it("renders a continuous ramp with a component-scoped gradient id", () => {
    const { container } = render(LegendHarness, { legend: ramp, theme });
    const gradient = container.querySelector("linearGradient");
    const bar = container.querySelector(".gg-legend-ramp");
    expect(gradient?.id).toMatch(/^gg-ramp-/);
    expect(bar?.getAttribute("fill")).toBe(`url(#${gradient?.id})`);
    expect(container.querySelectorAll("stop")).toHaveLength(2);
    expect(
      [...container.querySelectorAll(".gg-legend-label")].map((label) => label.textContent),
    ).toEqual(["10", "0"]);
    expect(container.querySelector("foreignObject, button")).toBeNull();
  });

  it("omits the title node and pins the ramp at y=0 when title is empty", () => {
    const untitled = { ...ramp, title: "" } satisfies SceneLegend;
    const { container } = render(LegendHarness, { legend: untitled, theme });
    expect(container.querySelector(".gg-legend-title")).toBeNull();
    const bar = container.querySelector(".gg-legend-ramp");
    expect(bar?.getAttribute("y")).toBe("0");
    // Tick labels are placed relative to rampTop=0 (not the titled offset of 18).
    const labels = [...container.querySelectorAll(".gg-legend-label")];
    expect(labels.map((label) => label.getAttribute("y"))).toEqual(["0", "80"]);
  });
});
