/**
 * SSR: coord + facet children land in the first server pass (#659 slice 5).
 */
import { describe, expect, it } from "vitest";

import CoordFacetSsr from "../fixtures/CoordFacetSsr.svelte";
import { renderSsrFixture } from "../helpers/ssr.js";

describe("Coord/Facet children SSR", () => {
  it('12a: <FacetWrap field="g"/> first server pass includes facet strips', () => {
    const fixture = renderSsrFixture(CoordFacetSsr, { mode: "facet" });
    expect(fixture.body).toContain("gg-plot-root");
    // Assert on rendered strip chrome, not a spec object.
    expect(fixture.body).toContain("gg-strip");
    expect(fixture.body).toMatch(/alpha|beta/);
  });

  it("12b: <CoordFlip/> first server pass renders horizontal col bars", () => {
    const fixture = renderSsrFixture(CoordFacetSsr, { mode: "coord" });
    expect(fixture.body).toContain("gg-plot-root");
    // Flipped cols paint as horizontal rects (width > height). Parse a rect.
    const rectMatch = fixture.body.match(
      /<rect[^>]*width="([^"]+)"[^>]*height="([^"]+)"[^>]*>|<rect[^>]*height="([^"]+)"[^>]*width="([^"]+)"[^>]*>/,
    );
    expect(rectMatch).not.toBeNull();
    const w = Number(rectMatch![1] ?? rectMatch![4]);
    const h = Number(rectMatch![2] ?? rectMatch![3]);
    expect(w).toBeGreaterThan(h);
  });
});
