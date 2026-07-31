/**
 * SSR: capability children resolve in the first server pass. Svelte's
 * one-pass SSR constructs the engine before declaration children register;
 * the ssrSafeDerived recompute path must not latch the empty registry as
 * inspect-off (capability-resolution.svelte.ts).
 */
import { describe, expect, it } from "vitest";

import InspectChildPlot from "../fixtures/InspectChildPlot.svelte";
import { renderSsrFixture } from "../helpers/ssr.js";

describe("capability resolution SSR", () => {
  it("<Inspect> child enables interaction chrome from the very first byte", () => {
    const fixture = renderSsrFixture(InspectChildPlot, { useInspect: true });
    // Focusable point targets + the capture surface exist only when the
    // inspect capability resolved server-side.
    expect(fixture.body).toContain("tabindex");
    expect(fixture.body).toContain("gg-capture");
  });

  it("no capability child, no prop: the same chrome is absent", () => {
    const fixture = renderSsrFixture(InspectChildPlot, {});
    expect(fixture.body).not.toContain("tabindex");
    expect(fixture.body).not.toContain("gg-capture");
  });
});
