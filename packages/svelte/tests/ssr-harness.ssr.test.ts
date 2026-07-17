import { describe, expect, it } from "vitest";

import GGPlot from "../src/lib/GGPlot.svelte";
import { createPlotInteraction } from "../src/lib/interaction/controller.svelte.js";
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

  it('keeps data-gg-ready="false" during SSR for fixed-width SVG plots (decision 0009)', () => {
    // $effect never runs on the server; prerendered HTML must not claim ready
    // so VR / screenshot tooling waits for the post-hydration committed flush.
    const fixture = renderSsrFixture(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      width: 480,
      height: 320,
    });

    expect(fixture.body).toContain('data-gg-ready="false"');
    expect(fixture.body).not.toContain('data-gg-ready="true"');
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

  it("server-renders with pre-populated non-union interval state (#165)", () => {
    const interaction = createPlotInteraction<number>();
    const interactionScope = { keys: "row-id", intervals: "restored-brush" } as const;
    interaction.setInterval(
      {
        panelId: "restored-panel",
        preset: "independent",
        domains: { x: { kind: "linear", domain: [1, 2] } },
        keys: [1],
      },
      { scope: interactionScope, source: "programmatic" },
    );

    const fixture = renderSsrFixture(GGPlot, {
      data: [
        { id: 1, x: 1, y: 2 },
        { id: 2, x: 2, y: 4 },
      ],
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      select: { type: "interval", persistent: true },
      interaction,
      interactionScope,
      width: 480,
      height: 320,
    });

    expect(fixture.body).toContain("gg-plot-root");
  });
});
