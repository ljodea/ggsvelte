import { describe, expect, it } from "vitest";

import GGPlot from "../src/lib/GGPlot.svelte";
import GGPlotHydrationFixture from "./fixtures/GGPlotHydrationFixture.svelte";
import HydrationFixture from "./fixtures/HydrationFixture.svelte";
import { renderSsrFixture } from "./helpers/ssr.js";

const rows = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
];

describe("SSR release fixture", () => {
  it("renders a chart without DOM globals and retains Svelte hydration markers", () => {
    const fixture = renderSsrFixture(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      width: 480,
      height: 320,
    });

    expect(fixture.body).toContain("gg-plot-root");
    expect(fixture.body).toContain("gg-plot");
    expect(fixture.body).toContain("<!--[-->");
    expect(fixture.html).toMatch(/^<!doctype html>/);
  });

  it("renders the canonical browser hydration fixture", () => {
    const fixture = renderSsrFixture(HydrationFixture, { label: "Selected", count: 2 });
    expect(fixture.body).toContain('data-hydrated="false"');
    expect(fixture.body).toContain("Selected: 2");
    expect(fixture.body).toContain("<!--[-->");
  });

  it("server-renders the same interactive GGPlot fixture used by the browser hydration gate", () => {
    const fixture = renderSsrFixture(GGPlotHydrationFixture, {});
    expect(fixture.body).toContain("data-ggplot-hydration-fixture");
    expect(fixture.body).toContain('data-hydrated="false"');
    expect(fixture.body).toContain('aria-label="Hydrated scatter plot"');
    expect(fixture.body).toContain("gg-capture");
    expect(fixture.body).toContain("<!--[-->");
  });
});
