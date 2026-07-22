import { describe, expect, it } from "bun:test";

import { neighbourOverlapAsym } from "../../src/layout/axis-overlap.ts";
import { plan } from "./fixtures.ts";

describe("planBandAxis: rotated angle + side cap (Codex P2)", () => {
  // Unwrappable single token (~151px) that overlaps single-line at these bands.
  const TOKEN = "Anlageverwaltungsgesellschaft";

  it("keeps −45° when labels clear neighbours but only exceed the bottom cap", () => {
    // 4 bands at 520px (≈130px each): single-line overlaps and the token can't
    // wrap, so the axis rotates. At −45° the labels clear their neighbours; the
    // bottom cap is tight, so the FIX truncates within −45° instead of −90°
    // (−90° would need MORE bottom space and truncate harder).
    const p = plan([TOKEN, TOKEN, TOKEN, TOKEN], 520, { orthogonalMarginCapPx: 80 });
    expect(p.mode).toBe("rotated");
    expect(p.angle).toBe(-45);
    expect(p.degraded).toContain("band-label-margin-overflow");
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
  });

  it("truncates a rotated label that overflows the side cap (not just the bottom)", () => {
    // Same −45° layout, but a tiny side (left) margin cap: the leftmost label
    // extends past x=0 and must be truncated to the side cap, not drawn into
    // chrome. Bottom cap is generous, so only the side path fires.
    const p = plan([TOKEN, TOKEN, TOKEN, TOKEN], 520, {
      marginCapPx: 18,
      orthogonalMarginCapPx: 400,
    });
    expect(p.mode).toBe("rotated");
    expect(p.angle).toBe(-45);
    expect(p.degraded).toContain("band-label-margin-overflow");
    expect(p.leftOverhang).toBeLessThanOrEqual(18 + 1e-6); // clamped to the side cap
    expect(p.ticks.some((t) => t.label.endsWith("…"))).toBe(true);
  });
});
describe("planBandAxis: end-label margin cap (Codex P2)", () => {
  it("truncates a lone over-wide label instead of clipping it at the panel edge", () => {
    const p = plan(["Una sola categoría con una etiqueta extremadamente larga que desborda"], 200, {
      orthogonalMarginCapPx: 400,
    });
    expect(p.mode).toBe("single-line");
    expect(p.degraded).toContain("band-label-margin-overflow");
    expect(p.ticks[0]!.label.endsWith("…")).toBe(true);
    expect(p.alongOverhang).toBeLessThanOrEqual(200 * 0.35); // clamped to the cap
  });

  it("reserves LEFT overhang for a centered lone label (both sides), not just right", () => {
    // A single centered label that overhangs both edges: left and right overhang
    // must both be reserved so it isn't clipped at x=0 (Codex P2).
    const p = plan(["Una sola categoría con una etiqueta extremadamente larga que desborda"], 200, {
      orthogonalMarginCapPx: 400,
    });
    expect(p.mode).toBe("single-line");
    expect(p.leftOverhang).toBeGreaterThan(0);
    expect(p.alongOverhang).toBeGreaterThan(0);
    expect(p.leftOverhang).toBeLessThanOrEqual(200 * 0.35);
  });
});
describe("planBandAxis: rotated overhang is left-heavy (Codex P2)", () => {
  it("reserves far more LEFT than right overhang for end-anchored −45 labels", () => {
    // A rotated axis whose leftmost label is wide: because the renderer anchors
    // rotated text at the end (extends up-LEFT), the left overhang must dominate
    // the right, not be a symmetric half-width.
    const p = plan(["Departamento de Recursos", "B", "C", "D"], 300, {
      orthogonalMarginCapPx: 200,
    });
    if (p.mode === "rotated" && p.angle === -45) {
      expect(p.leftOverhang).toBeGreaterThan(p.alongOverhang);
    }
    // At −90 the footprint is symmetric, so the assertion above is angle-gated;
    // the plan must still label every category regardless of chosen angle.
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
  });
});
describe("neighbourOverlapAsym: end-anchored rotated footprint (Codex P2)", () => {
  it("catches a left-heavy label colliding with its LEFT neighbour", () => {
    // Two ticks 20px apart. The right tick's label extends 30px to its LEFT
    // (end-anchored rotation) and only 2px right; the left tick is tiny. A
    // symmetric/centered model (half≈16 each side) would just barely pass, but
    // the real left extent reaches back into the left tick → overlap.
    const items = [
      { pos: 0, left: 2, right: 2 },
      { pos: 20, left: 30, right: 2 },
    ];
    expect(neighbourOverlapAsym(items, 4)).toBe(true);
  });

  it("does not flag when the left extent stays clear of the neighbour", () => {
    const items = [
      { pos: 0, left: 2, right: 2 },
      { pos: 60, left: 30, right: 2 },
    ];
    expect(neighbourOverlapAsym(items, 4)).toBe(false);
  });

  it("alreadySorted matches default sort for ascending pos order", () => {
    const items = [
      { pos: 0, left: 2, right: 2 },
      { pos: 20, left: 30, right: 2 },
      { pos: 80, left: 5, right: 5 },
    ];
    expect(neighbourOverlapAsym(items, 4, { alreadySorted: true })).toBe(
      neighbourOverlapAsym(items, 4),
    );
  });

  it("alreadySorted still catches overlap when items are pre-ordered ascending", () => {
    // Descending construction then reverse → ascending for alreadySorted.
    const descending = [
      { pos: 20, left: 30, right: 2 },
      { pos: 0, left: 2, right: 2 },
    ];
    const ascending = [...descending].toSorted((a, b) => a.pos - b.pos);
    expect(neighbourOverlapAsym(ascending, 4, { alreadySorted: true })).toBe(true);
  });
});
