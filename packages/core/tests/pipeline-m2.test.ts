/**
 * M2 statistical-layer pipeline surface, end to end: histogram (bar + bin),
 * smooth (+ ribbon), boxplot (composite geometry), density, errorbar
 * (identity + summary), jitter/nudge positions — advisories, structured
 * errors, na-drop warnings, and render determinism.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { PipelineError, runPipeline } from "../src/pipeline.ts";
import { renderToSVGString } from "../src/render-svg.ts";
import { mulberry32 } from "../src/stats/numeric.ts";
import type { PathsBatch, PointsBatch, RectsBatch, SegmentsBatch } from "../src/scene.ts";

const size = { width: 640, height: 400 };

function scatter(n: number, seed = 7): { x: number[]; y: number[]; g: string[] } {
  const rnd = mulberry32(seed);
  const x: number[] = [];
  const y: number[] = [];
  const g: string[] = [];
  for (let i = 0; i < n; i++) {
    const xv = rnd() * 10;
    x.push(xv);
    y.push(2 + 0.8 * xv + (rnd() - 0.5) * 2);
    g.push(i % 2 === 0 ? "a" : "b");
  }
  return { x, y, g };
}

// ---------------------------------------------------------------------------
// histogram (bar + stat bin)
// ---------------------------------------------------------------------------

describe("histogram geom (canonicalized to bar + stat bin)", () => {
  const data = scatter(200);

  it("emits bin-spanning rects on a continuous x scale", () => {
    const model = runPipeline(
      gg({ x: data.x }, aes({ x: "x" }))
        .geomHistogram({ binwidth: 1, boundary: 0 })
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("linear");
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.kind).toBe("rects");
    expect(batch.rects.length / 4).toBe(10); // 10 bins over (0, 10)
    // Bins abut: each rect's right edge is the next rect's left edge.
    for (let j = 1; j < 10; j++) {
      const prevRight = batch.rects[(j - 1) * 4]! + batch.rects[(j - 1) * 4 + 2]!;
      expect(batch.rects[j * 4]!).toBeCloseTo(prevRight, 3);
    }
    expect(model.advisories.some((a) => a.code === "bar-x-discretized")).toBe(false);
  });

  it("default bins = 30 emits the Hadley-lesson-12 advisory; explicit binwidth silences it", () => {
    const withDefault = runPipeline(
      gg({ x: data.x }, aes({ x: "x" }))
        .geomHistogram()
        .spec(),
      size,
    );
    const advisory = withDefault.advisories.find((a) => a.code === "bin-default-bins");
    expect(advisory).toBeDefined();
    expect(advisory!.chosen).toContain("bins = 30");
    expect(advisory!.howToOverride).toContain("binwidth");

    const explicit = runPipeline(
      gg({ x: data.x }, aes({ x: "x" }))
        .geomHistogram({ binwidth: 2 })
        .spec(),
      size,
    );
    expect(explicit.advisories.some((a) => a.code === "bin-default-bins")).toBe(false);
  });

  it("y = { stat: 'density' } resolves to the density column", () => {
    const model = runPipeline(
      gg({ x: data.x }, aes({ x: "x", y: { stat: "density" } }))
        .geomHistogram({ binwidth: 1, boundary: 0 })
        .spec(),
      size,
    );
    expect(model.scales.y.type).toBe("linear");
    if (model.scales.y.type !== "band") {
      expect(model.scales.y.domain[1]).toBeLessThan(1); // densities, not counts
    }
    expect(model.scene.axes.y.title).toBe("density");
  });

  it("stacked histograms by fill share breaks and stack per bin", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", fill: "g" }))
        .geomHistogram({ binwidth: 2.5, boundary: 0 })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.kind).toBe("rects");
    expect(batch.rects.length / 4).toBe(8); // 4 bins x 2 groups (zero bins kept)
    expect(new Set(batch.fills).size).toBe(2);
    expect(model.scene.legends).toHaveLength(1);
  });

  it("mapping aes.y to a field on a histogram is a structured error", () => {
    expect(() =>
      runPipeline(
        {
          data: { columns: { x: [1, 2], y: [1, 2] } },
          layers: [{ geom: "histogram", aes: { x: { field: "x" }, y: { field: "y" } } }],
        },
        size,
      ),
    ).toThrow(PipelineError);
  });

  it("center + boundary together is a structured error", () => {
    expect(() =>
      runPipeline(
        gg({ x: data.x }, aes({ x: "x" }))
          .geomHistogram({ binwidth: 1, center: 0, boundary: 0 })
          .spec(),
        size,
      ),
    ).toThrow(/center OR params.boundary/);
  });

  it("nominal x on the bin stat is a channel-type-mismatch error", () => {
    try {
      runPipeline(
        gg({ x: ["a", "b"] }, aes({ x: "x" }))
          .geomHistogram()
          .spec(),
        size,
      );
      expect.unreachable();
    } catch (error) {
      expect((error as PipelineError).code).toBe("channel-type-mismatch");
    }
  });
});

// ---------------------------------------------------------------------------
// smooth
// ---------------------------------------------------------------------------

describe("smooth geom", () => {
  const data = scatter(60);

  it("emits a ribbon (closed paths, under) then the fitted line", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y" }))
        .geomPoint()
        .geomSmooth({ method: "lm" })
        .spec(),
      size,
    );
    const smoothBatches = model.scene.batches.filter((b) => b.layerIndex === 1);
    expect(smoothBatches).toHaveLength(2);
    const ribbon = smoothBatches[0] as PathsBatch;
    const line = smoothBatches[1] as PathsBatch;
    expect(ribbon.kind).toBe("paths");
    expect(ribbon.closed).toBe(true);
    expect(ribbon.fills).toBeDefined();
    expect(line.closed).toBeUndefined();
    expect(line.pathOffsets.length - 1).toBe(1);
    expect(line.rowIndex.length).toBe(80); // n = 80 evaluation points
  });

  it("se: false renders the line only", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y" }))
        .geomSmooth({ method: "lm", se: false })
        .spec(),
      size,
    );
    const batches = model.scene.batches;
    expect(batches).toHaveLength(1);
    expect((batches[0] as PathsBatch).fills).toBeUndefined();
  });

  it("fits per group with per-group line colors (color mapping)", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "g" }))
        .geomSmooth({ method: "lm" })
        .spec(),
      size,
    );
    const line = model.scene.batches[1] as PathsBatch;
    expect(line.pathOffsets.length - 1).toBe(2);
    expect(new Set(line.strokes).size).toBe(2);
    // Ribbon tints follow the line colors.
    const ribbon = model.scene.batches[0] as PathsBatch;
    expect(ribbon.fills).toEqual(line.strokes);
  });

  it("infers the method with an advisory (loess under 1000 rows)", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y" }))
        .geomSmooth()
        .spec(),
      size,
    );
    const advisory = model.advisories.find((a) => a.code === "smooth-method-inferred");
    expect(advisory).toBeDefined();
    expect(advisory!.chosen).toContain('"loess"');
    expect(advisory!.howToOverride).toContain("params.method");
  });

  it("the se band trains the y scale (ribbon never clips)", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y" }))
        .geomSmooth({ method: "lm", level: 0.999 })
        .spec(),
      size,
    );
    expect(model.scales.y.type).toBe("linear");
  });

  it("nominal x/y fields are channel-type-mismatch errors", () => {
    try {
      runPipeline(
        gg({ x: ["a", "b", "c"], y: [1, 2, 3] }, aes({ x: "x", y: "y" }))
          .geomSmooth()
          .spec(),
        size,
      );
      expect.unreachable();
    } catch (error) {
      expect((error as PipelineError).code).toBe("channel-type-mismatch");
    }
  });

  it("degenerate groups are dropped with a warning", () => {
    const model = runPipeline(
      gg({ x: [1, 1, 1], y: [1, 2, 3] }, aes({ x: "x", y: "y" }))
        .geomSmooth({ method: "lm" })
        .spec(),
      size,
    );
    expect(model.warnings.some((w) => w.code === "smooth-group-dropped")).toBe(true);
    expect(model.warnings.some((w) => w.code === "empty-layer")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// boxplot
// ---------------------------------------------------------------------------

describe("boxplot geom", () => {
  const rows: { cat: string; v: number; side: string }[] = [];
  const rnd = mulberry32(11);
  for (const cat of ["a", "b", "c"]) {
    for (let i = 0; i < 20; i++) {
      rows.push({ cat, v: rnd() * 10 + (cat === "b" ? 8 : 0), side: i % 2 === 0 ? "l" : "r" });
    }
  }
  rows.push({ cat: "a", v: 60, side: "l" }); // guaranteed outlier

  it("composes whiskers, boxes, medians, and outlier points", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "cat", y: "v" }))
        .geomBoxplot()
        .spec(),
      size,
    );
    const kinds = model.scene.batches.map((b) => b.kind);
    expect(kinds).toEqual(["segments", "rects", "segments", "points"]);
    const [whiskers, boxes, medians, outliers] = model.scene.batches as [
      SegmentsBatch,
      RectsBatch,
      SegmentsBatch,
      PointsBatch,
    ];
    expect(boxes.rects.length / 4).toBe(3);
    expect(boxes.fillRole).toBe("paper");
    expect(boxes.stroke).toBeNull(); // theme ink outline
    expect(whiskers.segments.length / 4).toBe(6); // 2 per box
    expect(medians.segments.length / 4).toBe(3);
    expect(medians.linewidth).toBe(whiskers.linewidth * 2);
    expect(outliers.rowIndex.length).toBeGreaterThanOrEqual(1);
    expect(model.scales.x.type).toBe("band");
  });

  it("dodges grouped boxes within each band (fill mapping, default position)", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "cat", y: "v", fill: "side" }))
        .geomBoxplot()
        .spec(),
      size,
    );
    const boxes = model.scene.batches.find((b) => b.kind === "rects") as RectsBatch;
    expect(boxes.rects.length / 4).toBe(6); // 3 cats x 2 sides
    expect(new Set(boxes.fills).size).toBe(2);
    // Dodged pairs: two boxes per band, non-overlapping x ranges.
    const xs = Array.from({ length: 6 }, (_, j) => boxes.rects[j * 4]!).toSorted((a, b) => a - b);
    expect(new Set(xs.map((v) => v.toFixed(2))).size).toBe(6);
  });

  it("quantitative x is a channel-type-mismatch error (M2 scope: discrete x)", () => {
    try {
      runPipeline(
        gg({ x: [1, 2], y: [1, 2] }, aes({ x: "x", y: "y" }))
          .geomBoxplot()
          .spec(),
        size,
      );
      expect.unreachable();
    } catch (error) {
      expect((error as PipelineError).code).toBe("channel-type-mismatch");
    }
  });

  it("drops rows with missing y (na-drop warning)", () => {
    const model = runPipeline(
      gg({ x: ["a", "a", "a"], y: [1, null, 3] }, aes({ x: "x", y: "y" }))
        .geomBoxplot()
        .spec(),
      size,
    );
    expect(model.warnings.some((w) => w.code === "removed-missing")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// density
// ---------------------------------------------------------------------------

describe("density geom", () => {
  const data = scatter(120);

  it("renders a closed area path from the zero baseline", () => {
    const model = runPipeline(
      gg({ x: data.x }, aes({ x: "x" }))
        .geomDensity()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.kind).toBe("paths");
    expect(batch.closed).toBe(true);
    expect(batch.fills).toBeDefined();
    expect(model.scales.y.type).toBe("linear");
    if (model.scales.y.type !== "band") expect(model.scales.y.domain[0]).toBe(0);
    expect(model.scene.axes.y.title).toBe("density");
  });

  it("overlays one curve per fill group", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", fill: "g" }))
        .geomDensity({ alpha: 0.5 })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.pathOffsets.length - 1).toBe(2);
    expect(new Set(batch.fills).size).toBe(2);
    expect(batch.alpha).toBe(0.5);
    expect(model.scene.legends).toHaveLength(1);
  });

  it("warns and drops sub-two-point groups", () => {
    const model = runPipeline(
      gg({ x: [1, 2, 3, 4, 9], g: ["a", "a", "a", "a", "b"] }, aes({ x: "x", fill: "g" }))
        .geomDensity()
        .spec(),
      size,
    );
    expect(model.warnings.some((w) => w.code === "density-group-dropped")).toBe(true);
  });

  it("mapping aes.y on a density layer is a structured error", () => {
    try {
      runPipeline(
        gg({ x: [1, 2, 3], y: [1, 2, 3] }, aes({ x: "x", y: "y" }))
          .geomDensity()
          .spec(),
        size,
      );
      expect.unreachable();
    } catch (error) {
      expect((error as PipelineError).code).toBe("computed-y-mapped");
    }
  });
});

// ---------------------------------------------------------------------------
// errorbar + summary
// ---------------------------------------------------------------------------

describe("errorbar geom", () => {
  it("identity stat: three segments (bar + caps) per row from ymin/ymax fields", () => {
    const model = runPipeline(
      gg({ g: ["a", "b"], lo: [1, 2], hi: [3, 5] }, aes({ x: "g", ymin: "lo", ymax: "hi" }))
        .geomErrorbar()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as SegmentsBatch;
    expect(batch.kind).toBe("segments");
    expect(batch.segments.length / 4).toBe(6);
    expect(model.scales.x.type).toBe("band");
    if (model.scales.y.type !== "band") {
      expect(model.scales.y.domain[0]).toBeLessThanOrEqual(1);
      expect(model.scales.y.domain[1]).toBeGreaterThanOrEqual(5);
    }
  });

  it("summary stat computes mean_se bounds per x group", () => {
    const model = runPipeline(
      gg({ g: ["a", "a", "a", "b", "b", "b"], v: [1, 2, 3, 10, 12, 14] }, aes({ x: "g", y: "v" }))
        .geomErrorbar({ stat: "summary" })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as SegmentsBatch;
    expect(batch.segments.length / 4).toBe(6); // 2 groups x 3 segments
    // mean_se of [1,2,3]: mean 2, se = 1/sqrt(3) => domain min <= 2 - 0.577.
    if (model.scales.y.type !== "band") {
      expect(model.scales.y.domain[0]).toBeLessThanOrEqual(2 - 1 / Math.sqrt(3) + 1e-9);
    }
  });

  it("identity stat without ymin/ymax is a missing-channel error", () => {
    expect(() =>
      runPipeline(
        gg({ g: ["a"], v: [1] }, aes({ x: "g", y: "v" }))
          .geomErrorbar()
          .spec(),
        size,
      ),
    ).toThrow(PipelineError);
  });
});

// ---------------------------------------------------------------------------
// jitter + nudge
// ---------------------------------------------------------------------------

describe("jitter / nudge positions", () => {
  const rows = {
    cat: ["a", "a", "a", "b", "b", "b"],
    v: [1, 2, 3, 2, 3, 4],
  };
  const jittered = (seed?: number) =>
    gg(rows, aes({ x: "cat", y: "v" }))
      .geomPoint({ position: "jitter", ...(seed !== undefined && { positionParams: { seed } }) })
      .spec();

  it("is deterministic: same spec, same pixels, and emits the seeded advisory", () => {
    const a = runPipeline(jittered(), size);
    const b = runPipeline(jittered(), size);
    expect((a.scene.batches[0] as PointsBatch).positions).toEqual(
      (b.scene.batches[0] as PointsBatch).positions,
    );
    const advisory = a.advisories.find((adv) => adv.code === "jitter-seeded");
    expect(advisory).toBeDefined();
    expect(advisory!.chosen).toContain("seed 42");
    expect(advisory!.howToOverride).toContain("positionParams.seed");
  });

  it("a different seed moves the points; offsets stay inside the band", () => {
    const a = runPipeline(jittered(), size);
    const b = runPipeline(jittered(7), size);
    const pa = (a.scene.batches[0] as PointsBatch).positions;
    const pb = (b.scene.batches[0] as PointsBatch).positions;
    expect(pa).not.toEqual(pb);
    // Default width = 0.4 band fractions: x offsets < half a band step.
    const plain = runPipeline(
      gg(rows, aes({ x: "cat", y: "v" }))
        .geomPoint()
        .spec(),
      size,
    );
    const pc = (plain.scene.batches[0] as PointsBatch).positions;
    const panelWidth = plain.scene.panels[0]!.width;
    const step = panelWidth / 2; // two bands
    for (let i = 0; i < pa.length / 2; i++) {
      expect(Math.abs(pa[i * 2]! - pc[i * 2]!)).toBeLessThan(step * 0.4 + 1e-6);
    }
  });

  it("nudge shifts text labels by fixed offsets", () => {
    const base = gg(rows, aes({ x: "cat", y: "v", label: "cat" }));
    const plain = runPipeline(base.geomText().spec(), size);
    const nudged = runPipeline(
      base.layer({ geom: "text", position: "nudge", positionParams: { y: 0.5 } }).spec(),
      size,
    );
    const p0 = (plain.scene.batches[0] as { positions: Float32Array }).positions;
    const p1 = (nudged.scene.batches[0] as { positions: Float32Array }).positions;
    expect(p1[0]).toBeCloseTo(p0[0]!, 3);
    expect(p1[1]!).toBeLessThan(p0[1]!); // +0.5 data units = up in pixels
  });
});

// ---------------------------------------------------------------------------
// render determinism across the whole M2 surface
// ---------------------------------------------------------------------------

describe("renderToSVGString — M2 geoms", () => {
  it("renders every new geom deterministically (byte-identical reruns)", () => {
    const data = scatter(80);
    const spec = gg(data, aes({ x: "x", y: "y" }))
      .geomPoint({ position: "jitter", alpha: 0.5 })
      .geomSmooth({ method: "loess", span: 0.8 })
      .spec();
    const first = renderToSVGString(spec, size);
    const second = renderToSVGString(spec, size);
    expect(first).toBe(second);
    expect(first).toContain("<svg");
    expect(first).toContain("gg-paths");
  });

  it("boxplot + histogram + density + errorbar all reach SVG", () => {
    const data = scatter(60);
    for (const spec of [
      gg({ x: data.x }, aes({ x: "x" }))
        .geomHistogram({ binwidth: 1 })
        .spec(),
      gg(data, aes({ x: "g", y: "y" }))
        .geomBoxplot()
        .spec(),
      gg({ x: data.x }, aes({ x: "x" }))
        .geomDensity()
        .spec(),
      gg(data, aes({ x: "g", y: "y" }))
        .geomErrorbar({ stat: "summary" })
        .spec(),
    ]) {
      const svg = renderToSVGString(spec, size);
      expect(svg).toContain("<svg");
      expect(svg.length).toBeGreaterThan(500);
    }
  });
});
