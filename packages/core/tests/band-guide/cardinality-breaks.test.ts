import { describe, expect, it } from "bun:test";

import { planBandAxis } from "../../src/layout/band-guide.ts";
import { plan, measurer } from "./fixtures.ts";

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
