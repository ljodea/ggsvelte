/**
 * SSR: labs + guide children land in the first server pass (#659 slice 6).
 */
import { describe, expect, it } from "vitest";

import LabsGuidesLegendSsr from "../fixtures/LabsGuidesLegendSsr.svelte";
import { renderSsrFixture } from "../helpers/ssr.js";

describe("Labs/Guide children SSR", () => {
  it("8a: <Labs title x/> first server pass paints the title and axis label", () => {
    const fixture = renderSsrFixture(LabsGuidesLegendSsr, { mode: "labs" });
    expect(fixture.body).toContain("gg-plot-root");
    expect(fixture.body).toContain("Quarterly sales");
    expect(fixture.body).toContain("Quarter");
  });

  it('8b: <GuideNone channel="color"/> suppresses the legend server-side, not after hydration', () => {
    const suppressed = renderSsrFixture(LabsGuidesLegendSsr, { mode: "guide-none" });
    expect(suppressed.body).toContain("gg-plot-root");
    // The same plot without the child paints entries for both regions; with it,
    // the legend must be absent from the very first byte.
    expect(suppressed.body).not.toContain("North");
    expect(suppressed.body).not.toContain("South");
  });
});
