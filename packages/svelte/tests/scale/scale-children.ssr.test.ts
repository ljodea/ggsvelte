/**
 * SSR: <ScaleColorManual/> colors land in the first server pass (#659 slice 3, test 9).
 */
import { describe, expect, it } from "vitest";

import ScaleSsr from "../fixtures/ScaleSsr.svelte";
import { renderSsrFixture } from "../helpers/ssr.js";

describe("Scale children SSR", () => {
  it("9: <ScaleColorManual values={[…]}/> first server pass SVG contains #ff0000", () => {
    const fixture = renderSsrFixture(ScaleSsr, {});
    expect(fixture.body).toContain("gg-plot-root");
    // Assert on a rendered colour, not a spec object — theme SSR's
    // --gg-theme-paper has no scale analogue; a vague "child registered"
    // assertion can go green for the wrong reason.
    expect(fixture.body).toContain("#ff0000");
  });
});
