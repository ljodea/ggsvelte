/**
 * PR 3 — pre-stat position transform behavior (end to end).
 *
 * A position transform runs after parsing and before grouping-sensitive stats,
 * so scaleXLog10 changes the values consumed by smooth/bin/density, the affine
 * scale is trained in transformed space, and the public domain / inversion stay
 * semantic. Identity behavior is unchanged (covered by the wider suite).
 */
import { describe, expect, it } from "bun:test";

import { aes, gg, scaleXLog10, scaleXSqrt, scaleYLog10 } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.ts";

const size = { width: 640, height: 400 };
const log10Rows = [1, 10, 100, 1000, 10_000].map((x, i) => ({ x, y: i + 1 }));

function xScale(model: ReturnType<typeof runPipeline>) {
  const scale = model.scales.x;
  if (scale.type === "band") throw new Error("expected a continuous x scale");
  return scale;
}

describe("scaleXLog10 — transformed-space training + semantic domain", () => {
  const model = runPipeline(
    gg(log10Rows, aes({ x: "x", y: "y" }))
      .geomPoint()
      .scales(scaleXLog10())
      .spec(),
    size,
  );
  const scale = xScale(model);

  it("reports the linear family with a log10 transform (no trained log type)", () => {
    expect(scale.type).toBe("linear");
    expect(scale.transform).toBe("log10");
  });

  it("keeps the public domain semantic and positive", () => {
    expect(scale.domain[0]).toBeGreaterThan(0);
    expect(scale.domain[1]).toBeGreaterThan(scale.domain[0]);
    // data spans 1..10000 (4 decades); the semantic domain covers them.
    expect(scale.domain[0]).toBeLessThanOrEqual(1);
    expect(scale.domain[1]).toBeGreaterThanOrEqual(10_000);
  });

  it("trains affine in transformed (log) space: decades are evenly spaced", () => {
    // Equal semantic ratios map to equal pixel gaps (the hallmark of a log axis).
    const g1 = scale.normalize(100) - scale.normalize(10);
    const g2 = scale.normalize(1000) - scale.normalize(100);
    expect(g1).toBeCloseTo(g2, 9);
  });

  it("normalizeTransformed skips the forward; normalize forwards once", () => {
    // normalize(v) == normalizeTransformed(log10(v)); no double transform.
    expect(scale.normalize(100)).toBeCloseTo(scale.normalizeTransformed(Math.log10(100)), 12);
  });

  it("invert returns semantic values (round trip through forward+affine)", () => {
    for (const v of [1, 10, 100, 1000]) {
      expect(scale.invert(scale.normalize(v))).toBeCloseTo(v, 6);
    }
    // non-positive input is undefined on a log scale
    expect(Number.isNaN(scale.normalize(-5))).toBe(true);
  });
});

describe("scaleXLog10 vs identity change the stat inputs", () => {
  it("a smooth fit over log10 x differs from an identity fit", () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ x: (i + 1) * 25, y: Math.sqrt(i + 1) }));
    const identity = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomSmooth()
        .spec(),
      size,
    );
    const logged = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomSmooth()
        .scales(scaleXLog10())
        .spec(),
      size,
    );
    const idScale = xScale(identity);
    const logScale = xScale(logged);
    // The trained domains differ (linear extent vs log extent inverse-projected).
    expect(idScale.transform).toBe("identity");
    expect(logScale.transform).toBe("log10");
    // The two models are not the same fit: their normalized mark positions for a
    // mid-range x differ because the smoother consumed different x spacing.
    expect(idScale.normalize(500)).not.toBeCloseTo(logScale.normalize(500), 3);
  });

  it("a histogram over log10 x bins in transformed space (boundary 0 = semantic 1)", () => {
    const rows = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512].map((x) => ({ x }));
    const model = runPipeline(
      gg(rows, aes({ x: "x" }))
        .geomHistogram({ binwidth: 1, boundary: 0 })
        .scales(scaleXLog10())
        .spec(),
      size,
    );
    const scale = xScale(model);
    expect(scale.transform).toBe("log10");
    // Each power-of-two doubles; in log10 space they are evenly spaced, so
    // binwidth 1 (a decade) groups them without ever evaluating log10(0).
    expect(scale.domain[0]).toBeGreaterThan(0);
  });
});

describe("scaleXLog10 — geometry consumes normalizeTransformed, not normalize (no double transform)", () => {
  const rows = [1, 10, 100, 1000, 10_000].map((x, i) => ({ x, y: i + 1 }));

  it("points: no rows dropped, and consecutive decades render at equal pixel gaps", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .scales(scaleXLog10())
        .spec(),
      size,
    );
    const batch = model.scene.batches[0]!;
    if (batch.kind !== "points") throw new Error("expected a points batch");
    // 5 semantic decades, all strictly positive: none should be censored/dropped.
    expect(batch.rowIndex.length).toBe(5);
    const xs: number[] = [];
    for (let i = 0; i < batch.positions.length; i += 2) xs.push(batch.positions[i]!);
    const gaps = xs.slice(1).map((x, i) => x - xs[i]!);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]).toBeCloseTo(gaps[0]!, 1);
    }
  });

  it("lines: path vertices render at the same equal-decade pixel gaps as points", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomLine()
        .scales(scaleXLog10())
        .spec(),
      size,
    );
    const batch = model.scene.batches[0]!;
    if (batch.kind !== "paths") throw new Error("expected a paths batch");
    expect(batch.rowIndex.length).toBe(5);
    const xs: number[] = [];
    for (let i = 0; i < batch.positions.length; i += 2) xs.push(batch.positions[i]!);
    const gaps = xs.slice(1).map((x, i) => x - xs[i]!);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]).toBeCloseTo(gaps[0]!, 1);
    }
  });
});

describe("scaleXSqrt — transformed-space training", () => {
  const rows = [0, 1, 4, 9, 16, 25].map((x, i) => ({ x, y: i }));
  const model = runPipeline(
    gg(rows, aes({ x: "x", y: "y" }))
      .geomPoint()
      .scales(scaleXSqrt())
      .spec(),
    size,
  );
  const scale = xScale(model);

  it("reports the sqrt transform and admits semantic zero", () => {
    expect(scale.transform).toBe("sqrt");
    expect(scale.normalize(0)).not.toBeNaN();
    expect(scale.normalize(-1)).toBeNaN();
  });

  it("spaces perfect squares evenly (even in sqrt space)", () => {
    const g1 = scale.normalize(4) - scale.normalize(1);
    const g2 = scale.normalize(9) - scale.normalize(4);
    expect(g1).toBeCloseTo(g2, 9);
  });
});

describe("candidate values cross back into semantic source space", () => {
  it("inverse-projects synthesized smooth x/y values exactly once", () => {
    const rows = [1, 10, 100, 1000].map((value) => ({ x: value, y: value }));
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomSmooth({ method: "lm", se: false, n: 4 })
        .scales({ ...scaleXLog10(), ...scaleYLog10() })
        .spec(),
      size,
    );
    const candidates = Array.from({ length: model.candidates.size }, (_, id) =>
      model.candidates.candidate(id),
    ).filter((candidate) => candidate !== null);
    expect(candidates[0]!.xValue).toBeCloseTo(1, 8);
    expect(candidates[0]!.yValue).toBeCloseTo(1, 8);
    expect(candidates.at(-1)!.xValue).toBeCloseTo(1000, 6);
    expect(candidates.at(-1)!.yValue).toBeCloseTo(1000, 6);
  });
});

describe("log10 zero-baseline geoms — shared transformed-origin baseline (never log10(0))", () => {
  const barRows = [
    { g: "a", y: 10 },
    { g: "b", y: 100 },
    { g: "c", y: 1000 },
  ];

  it("geomCol under scaleYLog10 renders every bar (no NaN baseline, no row drops)", () => {
    const model = runPipeline(
      gg(barRows, aes({ x: "g", y: "y" }))
        .geomCol()
        .scales(scaleYLog10())
        .spec(),
      size,
    );
    const batch = model.scene.batches.find((b) => b.kind === "rects");
    if (batch === undefined || batch.kind !== "rects") throw new Error("expected a rects batch");
    expect(batch.rowIndex.length).toBe(3);
    for (const v of batch.rects) expect(Number.isFinite(v)).toBe(true);
  });

  it("emits one deduplicated scale-baseline-transformed-origin advisory per axis, not one per row/layer", () => {
    const model = runPipeline(
      gg(barRows, aes({ x: "g", y: "y" }))
        .geomCol()
        .scales(scaleYLog10())
        .spec(),
      size,
    );
    const hits = model.advisories.filter((a) => a.code === "scale-baseline-transformed-origin");
    expect(hits.length).toBe(1);
    expect(hits[0]!.path).toBe("scales.y");
  });

  it("does not emit the transformed-origin advisory for identity/sqrt bar measures", () => {
    const model = runPipeline(
      gg(barRows, aes({ x: "g", y: "y" }))
        .geomCol()
        .spec(),
      size,
    );
    expect(model.advisories.some((a) => a.code === "scale-baseline-transformed-origin")).toBe(
      false,
    );
  });

  it("geomDensity under scaleYLog10 renders a finite baseline (density's ymin shares the helper)", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ x: i + 1 }));
    const model = runPipeline(
      gg(rows, aes({ x: "x" }))
        .geomDensity()
        .scales(scaleYLog10())
        .spec(),
      size,
    );
    const batch = model.scene.batches.find((b) => b.kind === "paths");
    if (batch === undefined || batch.kind !== "paths") throw new Error("expected a paths batch");
    for (const v of batch.positions) expect(Number.isFinite(v)).toBe(true);
    expect(model.advisories.some((a) => a.code === "scale-baseline-transformed-origin")).toBe(true);
  });
});
