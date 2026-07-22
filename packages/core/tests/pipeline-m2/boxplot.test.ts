/**
 * M2 pipeline — boxplot geom.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg } from "@ggsvelte/spec";
import { PipelineError, runPipeline } from "../../src/pipeline.ts";
import { mulberry32 } from "../../src/stats/numeric.ts";
import type { PointsBatch, RectsBatch, SegmentsBatch } from "../../src/scene.ts";
import { size } from "./fixtures.ts";

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
