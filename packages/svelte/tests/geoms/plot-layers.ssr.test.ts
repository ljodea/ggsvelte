/**
 * SSR: non-mark plot layers registered by children are present on the first
 * server pass (ADR 0001 finding 1 — children render before registry-consuming
 * markup).
 */
import { describe, expect, it } from "vitest";

import PlotLayerSsr from "../fixtures/PlotLayerSsr.svelte";
import { renderSsrFixture } from "../helpers/ssr.js";

describe("plotLayers SSR", () => {
  it("includes a non-mark labs layer on the first server pass", () => {
    const fixture = renderSsrFixture(PlotLayerSsr, {});
    expect(fixture.body).toContain("gg-plot-root");
    // sceneLabel / aria-label carries labs.title when present.
    expect(fixture.body).toContain("ssr-plot-layer-title");
  });
});
