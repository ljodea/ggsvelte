import { describe, expect, it } from "bun:test";

import { FONT_METRICS } from "../src/layout/font-metrics.ts";
import { MetricsTableMeasurer } from "../src/layout/measure.ts";
import { planBandAxis, type BandAxisPlanInput } from "../src/layout/band-guide.ts";
import { neighbourOverlapAsym } from "../src/layout/axis-overlap.ts";

const measurer = new MetricsTableMeasurer(FONT_METRICS);

const plan = (categories: string[], extentPx: number, over: Partial<BandAxisPlanInput> = {}) =>
  planBandAxis({
    aesthetic: "x",
    panelIndex: 0,
    categoryCount: categories.length,
    entries: categories.map((value, domainIndex) => ({ value, label: value, domainIndex })),
    orient: "horizontal",
    extentPx,
    reverse: false,
    measurer,
    fontSize: 11,
    marginCapPx: extentPx * 0.35,
    orthogonalMarginCapPx: 105, // 0.35 * 300 (typical dashboard height)
    ...over,
  });

describe("planBandAxis: escalation ladder", () => {
  it("short labels stay on a single line with no degradation", () => {
    const p = plan(["IT", "HR", "Ops", "Sales"], 480);
    expect(p.mode).toBe("single-line");
    expect(p.angle).toBe(0);
    expect(p.degraded).toEqual([]);
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
    expect(p.ticks.every((t) => t.lines === undefined || t.lines.length === 1)).toBe(true);
    // A single line of labels needs one line-height of bottom band.
    expect(p.labelBandHeight).toBeLessThanOrEqual(measurer.measureHeight(11) + 1);
  });

  it("wraps multi-word labels to at most two lines, keeping every category", () => {
    // The issue's repro at 480px (band ≈ 96px): the long labels overflow one line
    // but wrap into ≤2 lines that fit the band — the readable, no-drop outcome.
    const p = plan(
      ["Resolución", "Corrección (errores o erratas)", "Sentencia", "Orden", "Otro"],
      480,
    );
    expect(p.mode).toBe("wrapped");
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
    expect(p.ticks.every((t) => (t.lines?.length ?? 1) <= 2)).toBe(true);
    // Two lines reserve more than one line-height.
    expect(p.labelBandHeight).toBeGreaterThan(measurer.measureHeight(11));
  });

  it("rotates long labels rather than dropping any category", () => {
    // Same labels at 240px (band ≈ 48px): "Corrección" alone exceeds the band, so
    // wrapping is impossible — escalate to rotation, still labelling every bar.
    const p = plan(
      ["Resolución", "Corrección (errores o erratas)", "Sentencia", "Orden", "Otro"],
      240,
    );
    expect(p.mode).toBe("rotated");
    expect([-45, -90]).toContain(p.angle);
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
    expect(p.ticks.every((t) => t.angle === p.angle)).toBe(true);
  });

  it("uses a uniform mode across the whole axis (no ragged mix)", () => {
    const p = plan(["A", "Corrección (errores o erratas)", "B", "C"], 480);
    const angles = new Set(p.ticks.map((t) => t.angle ?? 0));
    expect(angles.size).toBe(1);
  });

  it("truncates a single over-long token only as a last resort, keeping its tick", () => {
    // One un-wrappable token, narrow band, short orthogonal cap => rotate can't fit => truncate.
    const p = plan(["Anlageverwaltungsgesellschaftsvertrag", "Kurz", "Mittel"], 200, {
      orthogonalMarginCapPx: 40,
    });
    expect(p.degraded).toContain("band-label-margin-overflow");
    expect(p.ticks.every((t) => t.labeled)).toBe(true); // every category still labelled
    const long = p.ticks.find((t) => t.value === "Anlageverwaltungsgesellschaftsvertrag");
    expect(long?.label.endsWith("…")).toBe(true);
  });
});

describe("planBandAxis: high cardinality", () => {
  it("thins labels (labelEvery > 1) when there are too many bars to ever fit", () => {
    const cats = Array.from({ length: 40 }, (_, i) => `Category number ${i + 1} — extended`);
    const p = plan(cats, 240);
    expect(p.labelEvery).toBeGreaterThan(1);
    // Every shown label is still a real, whole category name (thinned, not overlapped away).
    expect(p.ticks.filter((t) => t.labeled).length).toBeGreaterThan(1);
  });
});

describe("planBandAxis: sparse explicit breaks (Codex P2)", () => {
  it("does not thin far-apart break labels even when the full domain is huge", () => {
    // 100-category domain, 3 explicit breaks at 0/50/99: the displayed ticks are
    // ~235px apart, so nothing should be thinned even though extentPx/100 is tiny.
    const longLabel = "Muy larga etiqueta de categoría con detalle";
    const p = planBandAxis({
      aesthetic: "x",
      panelIndex: 0,
      categoryCount: 100,
      entries: [0, 50, 99].map((domainIndex) => ({
        value: `c${domainIndex}`,
        label: longLabel,
        domainIndex,
      })),
      orient: "horizontal",
      extentPx: 480,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 168,
      orthogonalMarginCapPx: 400,
    });
    expect(p.labelEvery).toBe(1); // no thinning
    expect(p.ticks.every((t) => t.labeled)).toBe(true); // every authored break kept
    expect(p.overlap).toBe(false);
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

describe("planBandAxis: small authored break subset (Codex P2)", () => {
  it("never thins a handful of close-together authored breaks in a huge domain", () => {
    // 100-category domain, but only 3 authored breaks at ADJACENT indices 0/1/2 —
    // they collide, yet each is a named break and must be kept (overlap reported,
    // not thinned away), because thinning is gated on displayed count (3), not n.
    const longLabel = "Etiqueta de categoría bastante larga";
    const p = planBandAxis({
      aesthetic: "x",
      panelIndex: 0,
      categoryCount: 100,
      entries: [0, 1, 2].map((domainIndex) => ({
        value: `c${domainIndex}`,
        label: longLabel,
        domainIndex,
      })),
      orient: "horizontal",
      extentPx: 480,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 168,
      orthogonalMarginCapPx: 400,
    });
    expect(p.labelEvery).toBe(1); // no thinning of authored breaks
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
    expect(p.overlap).toBe(true); // collision surfaced instead of hidden
    expect(p.degraded).toContain("band-label-overlap");
  });
});

describe("planBandAxis: footprint after thinning (Codex P2)", () => {
  it("does not emit margin-overflow for a wide label that thinning hides", () => {
    // Many categories: a single giant label sits on an ODD index (hidden once
    // labelEvery becomes 2+), the rest are short. The orthogonal check must use
    // only the labels that render, so no band-label-margin-overflow is emitted.
    const cats = Array.from({ length: 40 }, (_, i) =>
      i === 1 ? "Anlageverwaltungsgesellschaftsvertragsklauselwerk" : "Ab",
    );
    const p = plan(cats, 240, { orthogonalMarginCapPx: 60 });
    expect(p.labelEvery).toBeGreaterThan(1);
    const giant = p.ticks.find((t) => t.fullLabel.startsWith("Anlage"));
    expect(giant?.labeled).toBe(false); // hidden by thinning
    expect(p.degraded).not.toContain("band-label-margin-overflow");
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
