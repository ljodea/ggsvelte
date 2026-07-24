/**
 * SSR: <ThemeDark/> theme lands in the first server pass (#659 slice 2, test 7).
 */
import { describe, expect, it } from "vitest";

import ThemeSsr from "../fixtures/ThemeSsr.svelte";
import { renderSsrFixture } from "../helpers/ssr.js";

describe("Theme children SSR", () => {
  it("7: <ThemeDark/> theme lands in the first server pass", () => {
    const fixture = renderSsrFixture(ThemeSsr, {});
    expect(fixture.body).toContain("gg-plot-root");
    // Dark theme paints paper role #16181d on the root style (same signal
    // presentation tests use for theme="dark").
    expect(fixture.body).toMatch(/#16181d|--gg-theme-paper:\s*#16181d/i);
  });
});
