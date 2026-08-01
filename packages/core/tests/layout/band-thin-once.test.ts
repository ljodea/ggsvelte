/**
 * Band y tick thinning must not rebuild every tick on each labelEvery doubling (#1335).
 *
 * Only the `labeled` flag depends on every; values, labels, and domainIndex stay
 * fixed. Counting formatY calls observes rebuilds without spying on deriveTicks.
 */
import { describe, expect, it } from "bun:test";

import { layout, layoutPass, DEFAULT_LAYOUT_THEME } from "../../src/layout/layout.ts";
import { band, base, lin, measurer, theme } from "./fixtures.ts";

function longCategories(k: number): string[] {
  return Array.from({ length: k }, (_, i) => `Category with a long name number ${i}`);
}

describe("band y thinning rebuild cost (#1335)", () => {
  it("formats each category once per layoutPass while thinning labelEvery", () => {
    const k = 64;
    const cats = longCategories(k);
    let formats = 0;
    const formatY = (v: string | number) => {
      formats++;
      return String(v);
    };
    // One pass only so the budget is k, not 2k.
    layoutPass(
      theme.marginPriors,
      {
        width: 400,
        height: 300,
        x: lin(0, 100),
        y: band(...cats),
        measurer,
        formatY,
      },
      theme,
    );
    expect(formats).toBe(k);
  });

  it("keeps the same chosen labelEvery, labeled mask, and degradation order", () => {
    const k = 64;
    const cats = longCategories(k);
    const r = layout(
      base({
        width: 400,
        height: 300,
        x: lin(0, 100),
        y: band(...cats),
      }),
    );
    // Characterisation of the current thinning outcome (must not change).
    expect(r.y.labelEvery).toBe(32);
    expect(r.y.ticks).toHaveLength(k);
    expect(r.y.ticks.map((t) => t.value)).toEqual(cats);
    for (let i = 0; i < k; i++) {
      expect(r.y.ticks[i]!.labeled).toBe(i % r.y.labelEvery === 0);
    }
    expect(r.degradations[0]).toBe("y:thin");
    expect(r.degradations).toContain("y:truncate");
  });

  it("stops doubling when the next every would cover the whole tick list", () => {
    // Very tight capLeft forces the loop to the break arm rather than fitting.
    const cats = longCategories(8);
    const r = layout(
      base({
        width: 80,
        height: 200,
        x: lin(0, 10),
        y: band(...cats),
        theme: {
          ...DEFAULT_LAYOUT_THEME,
          maxMarginFraction: 0.05,
        },
      }),
    );
    // last successful double: every=4 (4*2=8 not < 8, so break). Labeled at 0,4.
    expect(r.y.labelEvery).toBe(4);
    expect(r.y.ticks.filter((t) => t.labeled).map((t) => t.value)).toEqual([cats[0], cats[4]]);
  });
});
