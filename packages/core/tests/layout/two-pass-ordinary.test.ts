/**
 * Ordinary two-pass layout convergence and pass-B dominance.
 */
import { describe, expect, it } from "bun:test";

import { layout, layoutPass } from "../../src/layout/layout.ts";
import { base, lin, measurer, theme } from "./fixtures.ts";

describe("two-pass layout: ordinary cases", () => {
  it("converges on a typical plot and produces sane margins", () => {
    const r = layout(base({}));
    expect(r.converged).toBe(true);
    expect(r.degradations).toEqual([]);
    // Left margin fits the widest y label plus tick+gap.
    const widest = Math.max(
      ...r.y.ticks.map((t) => measurer.measureWidth(t.label, theme.fontSize)),
    );
    expect(r.margins.left).toBeGreaterThanOrEqual(widest + theme.tickLength + theme.tickLabelGap);
    // Quantized to the 4px grid.
    for (const side of [r.margins.top, r.margins.right, r.margins.bottom, r.margins.left]) {
      expect(side % theme.quantum).toBe(0);
    }
    expect(r.innerWidth).toBeGreaterThan(0.5 * 640);
    expect(r.innerHeight).toBeGreaterThan(0.5 * 400);
  });

  it("pass B wins when priors were way off (no third pass)", () => {
    // y labels are much wider than the 44px prior → pass A grows left a lot.
    const r = layout(base({ y: lin(1_000_000, 9_000_000) }));
    // Result is exactly a single re-run of the pass with pass-A margins.
    const again = layoutPass(r.passAMargins, base({ y: lin(1_000_000, 9_000_000) }), theme);
    expect(r.margins).toEqual(again.margins);
    expect(r.passes).toBe(2);
  });
});
