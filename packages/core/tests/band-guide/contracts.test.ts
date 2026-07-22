import { describe, expect, it } from "bun:test";

import { planBandAxis } from "../../src/layout/band-guide.ts";
import { plan, measurer } from "./fixtures.ts";

describe("planBandAxis: overlap detection", () => {
  it("flags overlap when even rotation cannot separate low-cardinality labels", () => {
    // Very narrow band, few long labels, generous height: rotate -90 chosen but bands
    // still narrower than a line-height => neighbour overlap.
    const p = plan(["Alpha", "Bravo", "Charlie"], 18, { orthogonalMarginCapPx: 400 });
    expect(p.overlap).toBe(true);
    expect(p.degraded).toContain("band-label-overlap");
  });
});
describe("planBandAxis: determinism and monotonicity", () => {
  it("is deterministic for identical inputs (same measurer)", () => {
    const a = plan(["Resolución", "Corrección (errores o erratas)", "Sentencia"], 300);
    const b = plan(["Resolución", "Corrección (errores o erratas)", "Sentencia"], 300);
    expect(a.mode).toBe(b.mode);
    expect(a.angle).toBe(b.angle);
    expect(a.labelBandHeight).toBe(b.labelBandHeight);
  });

  it("escalate-only: never returns a lighter mode than previousMode", () => {
    // Inputs that would otherwise wrap, but pass A already rotated.
    const p = plan(["North region", "South region", "East region", "West region"], 480, {
      previousMode: "rotated",
    });
    expect(p.mode).toBe("rotated");
  });
});
describe("planBandAxis: edge cases", () => {
  it("numbers-as-categories stay single-line (no-op)", () => {
    const p = plan(["2019", "2020", "2021", "2022", "2023"], 480);
    expect(p.mode).toBe("single-line");
    expect(p.degraded).toEqual([]);
  });

  it("a single category has no neighbour overlap", () => {
    const p = plan(["Corrección (errores o erratas)"], 480);
    expect(p.overlap).toBe(false);
    expect(p.ticks).toHaveLength(1);
    expect(p.ticks[0]!.labeled).toBe(true);
  });

  it("an empty-string category does not crash and stays labelled", () => {
    const p = plan(["", "Real", "Other"], 480);
    expect(p.ticks).toHaveLength(3);
    expect(p.mode).toBe("single-line");
  });

  it("lays out only the entries it is given (break subset), keeping their positions", () => {
    // A break subset of a 4-category domain: only Alpha (0) and Charlie (2).
    const p = planBandAxis({
      aesthetic: "x",
      panelIndex: 0,
      categoryCount: 4,
      entries: [
        { value: "Alpha", label: "Alpha", domainIndex: 0 },
        { value: "Charlie", label: "Charlie", domainIndex: 2 },
      ],
      orient: "horizontal",
      extentPx: 480,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 168,
      orthogonalMarginCapPx: 105,
    });
    expect(p.ticks.map((t) => t.value)).toEqual(["Alpha", "Charlie"]);
  });
});
