import { describe, expect, it } from "bun:test";

import { uniformAngleBaselinesCollide } from "../../src/layout/axis-overlap.ts";
import { plan, measurer } from "./fixtures.ts";

describe("uniformAngleBaselinesCollide: parallel rotated labels", () => {
  // End-anchored labels at a shared angle sit on parallel baselines. Glyphs
  // collide only when perpendicular separation < lineHeight + gap — independent
  // of label width (a long AABB into the neighbour column is not text-text).

  it("clears −45° when band separation beats line height even if AABB would overlap", () => {
    const lineH = measurer.measureHeight(11);
    // 80px band at −45: perp = 80·sin45 ≈ 56.6 ≫ lineH+4
    expect(uniformAngleBaselinesCollide(-45, 80, lineH, 4)).toBe(false);
  });

  it("flags collision when bands are too tight for −45° baselines", () => {
    const lineH = measurer.measureHeight(11);
    // 10px band at −45: perp ≈ 7.07 < lineH+4
    expect(uniformAngleBaselinesCollide(-45, 10, lineH, 4)).toBe(true);
  });

  it("at −90° uses full band width as perpendicular separation", () => {
    const lineH = measurer.measureHeight(11);
    expect(uniformAngleBaselinesCollide(-90, lineH + 5, lineH, 4)).toBe(false);
    expect(uniformAngleBaselinesCollide(-90, lineH, lineH, 4)).toBe(true);
  });
});

describe("planBandAxis: −45 text-text vs column-box (#634 concern 2)", () => {
  const MIXED = [
    "Real Decreto",
    "Orden",
    "Ley",
    "Resolución",
    "Corrección (errores o erratas)",
    "Sentencia",
    "Directiva",
    "Reglamento",
  ] as const;

  it("does not flag band-label-overlap for −45 on the 8-cat fixture when wrap is pinned away", () => {
    // Force rotation rung via previousMode so we exercise chooseAutoAngle +
    // rotatedPlan without the wrap fix absorbing the case.
    const p = plan([...MIXED], 640, { previousMode: "rotated" });
    expect(p.mode).toBe("rotated");
    expect(p.angle).toBe(-45);
    expect(p.overlap).toBe(false);
    expect(p.degraded).not.toContain("band-label-overlap");
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
  });
});
