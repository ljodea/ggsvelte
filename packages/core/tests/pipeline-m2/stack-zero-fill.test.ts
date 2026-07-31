/**
 * Default stacked area with sparse groups — auto zero-fill (#1268).
 *
 * A group with an interior x hole used to chord straight across it while the
 * stack below varied, rendering a floating polygon. The default path now
 * zero-fills missing group×x cells onto the shared grid and discloses a
 * `stack-zero-filled` advisory. Exterior-only incompleteness, non-overlapping
 * ranges, single groups, and unstacked positions are untouched.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg } from "@ggsvelte/spec";
import { runPipeline } from "../../src/pipeline.ts";
import type { PathsBatch } from "../../src/scene.ts";
import { size } from "./fixtures.ts";

/** a covers x=0..4 with a dip at x=2; b (first-seen, on top) only at x=1,3. */
const sparse = {
  x: [1, 3, 0, 1, 2, 3, 4],
  y: [2, 2, 3, 3, 0.5, 3, 3],
  g: ["b", "b", "a", "a", "a", "a", "a"],
};

/** Same data with b's missing cells filled with explicit zeros. */
const completed = {
  x: [0, 1, 2, 3, 4, 0, 1, 2, 3, 4],
  y: [0, 2, 0, 2, 0, 3, 3, 0.5, 3, 3],
  g: ["b", "b", "b", "b", "b", "a", "a", "a", "a", "a"],
};

function areaModel(data: Record<string, unknown[]>, opts?: Record<string, unknown>) {
  return runPipeline(
    gg(data as never, aes({ x: "x", y: "y", fill: "g" }))
      .geomArea({ ...opts })
      .spec(),
    size,
  );
}

function firstBatch(model: ReturnType<typeof runPipeline>): PathsBatch {
  return model.scene.batches[0] as PathsBatch;
}

function expectPositionsEqual(actual: PathsBatch, expected: PathsBatch): void {
  expect(Array.from(actual.pathOffsets)).toEqual(Array.from(expected.pathOffsets));
  expect(actual.positions.length).toBe(expected.positions.length);
  for (let i = 0; i < expected.positions.length; i++) {
    expect(actual.positions[i]!).toBeCloseTo(expected.positions[i]!, 4);
  }
}

function zeroFillAdvisories(model: ReturnType<typeof runPipeline>) {
  return model.advisories.filter((a) => a.code === "stack-zero-filled");
}

describe("stacked area auto zero-fill (#1268)", () => {
  it("zero-fills an interior hole and matches manually completed data", () => {
    const auto = areaModel(sparse);
    const manual = areaModel(completed);
    expectPositionsEqual(firstBatch(auto), firstBatch(manual));
    expect(zeroFillAdvisories(auto).length).toBe(1);
    expect(zeroFillAdvisories(manual).length).toBe(0);
  });

  it("keeps full-coverage stacks on the identity path", () => {
    const model = areaModel({
      x: [0, 1, 2, 0, 1, 2],
      y: [1, 2, 1, 3, 3, 3],
      g: ["b", "b", "b", "a", "a", "a"],
    });
    expect(zeroFillAdvisories(model).length).toBe(0);
    expect(firstBatch(model).pathOffsets.length).toBe(3);
  });

  it("does not fire on exterior-only incompleteness", () => {
    const model = areaModel({
      x: [0, 1, 0, 1, 2, 3, 4],
      y: [2, 2, 3, 3, 0.5, 3, 3],
      g: ["b", "b", "a", "a", "a", "a", "a"],
    });
    expect(zeroFillAdvisories(model).length).toBe(0);
  });

  it("does not fire on non-overlapping ranges", () => {
    const model = areaModel({
      x: [0, 1, 2, 3, 4, 5],
      y: [1, 1, 1, 2, 2, 2],
      g: ["a", "a", "a", "b", "b", "b"],
    });
    expect(zeroFillAdvisories(model).length).toBe(0);
  });

  it("does not fire for a single group", () => {
    const model = areaModel({
      x: [0, 1, 3, 4],
      y: [1, 2, 2, 1],
      g: ["a", "a", "a", "a"],
    });
    expect(zeroFillAdvisories(model).length).toBe(0);
  });

  it("does not fire for position identity", () => {
    const model = areaModel(sparse, { position: "identity" });
    expect(zeroFillAdvisories(model).length).toBe(0);
  });

  it("zero-fills under position fill", () => {
    const auto = areaModel(sparse, { position: "fill" });
    const manual = areaModel(completed, { position: "fill" });
    expectPositionsEqual(firstBatch(auto), firstBatch(manual));
    expect(zeroFillAdvisories(auto).length).toBe(1);
  });

  it("does not fire when stat align is explicit", () => {
    const model = areaModel(sparse, { stat: "align" });
    expect(zeroFillAdvisories(model).length).toBe(0);
  });

  it("fires for temporal x with an interior hole", () => {
    const model = areaModel({
      x: ["2024-01-01", "2024-01-03", "2024-01-01", "2024-01-02", "2024-01-03"],
      y: [2, 2, 3, 0.5, 3],
      g: ["b", "b", "a", "a", "a"],
    });
    expect(zeroFillAdvisories(model).length).toBe(1);
  });

  it("emits one advisory on the final model under facets", () => {
    const model = runPipeline(
      gg(
        {
          x: [1, 3, 0, 1, 2, 3, 4, 0, 1, 2],
          y: [2, 2, 3, 3, 0.5, 3, 3, 1, 1, 1],
          g: ["b", "b", "a", "a", "a", "a", "a", "a", "a", "a"],
          p: ["p1", "p1", "p1", "p1", "p1", "p1", "p1", "p2", "p2", "p2"],
        },
        aes({ x: "x", y: "y", fill: "g" }),
      )
        .geomArea()
        .facet({ wrap: "p" })
        .spec(),
      size,
    );
    expect(zeroFillAdvisories(model).length).toBe(1);
  });

  it("does not fire when a bar/col layer discretizes the shared x", () => {
    // A col layer trains numeric x as bands; the numeric-only shared-grid
    // frame cannot map onto them, so the rescue must stand down and the area
    // must keep rendering (regression: rows dropped as unmappable).
    const model = runPipeline(
      gg(
        {
          x: [1, 3, 1, 2, 3],
          y: [2, 2, 3, 0.5, 3],
          g: ["b", "b", "a", "a", "a"],
        },
        aes({ x: "x", y: "y", fill: "g" }),
      )
        .geomArea({ alpha: 0.5 })
        .geomCol({ alpha: 0.3 })
        .spec(),
      size,
    );
    expect(zeroFillAdvisories(model).length).toBe(0);
    const areas = model.scene.batches.find((b) => b.kind === "paths");
    expect(areas).toBeDefined();
    expect((areas as PathsBatch).positions.length).toBeGreaterThan(0);
  });

  it("does not fire for discrete string x", () => {
    const model = areaModel({
      x: ["m1", "m3", "m0", "m1", "m2", "m3", "m4"],
      y: [2, 2, 3, 3, 0.5, 3, 3],
      g: ["b", "b", "a", "a", "a", "a", "a"],
    });
    expect(zeroFillAdvisories(model).length).toBe(0);
  });

  it("does not fire when scales.x.type is band", () => {
    const model = runPipeline(
      gg(sparse as never, aes({ x: "x", y: "y", fill: "g" }))
        .geomArea()
        .scales({ x: { type: "band" } })
        .spec(),
      size,
    );
    expect(zeroFillAdvisories(model).length).toBe(0);
  });

  it("ignores groups with no finite rows when detecting and filling", () => {
    const model = areaModel({
      x: [1, 3, 0, 1, 2, 3, 4, 0, 4],
      y: [2, 2, 3, 3, 0.5, 3, 3, null, null],
      g: ["b", "b", "a", "a", "a", "a", "a", "c", "c"],
    });
    expect(zeroFillAdvisories(model).length).toBe(1);
    // Only a and b produce ribbons; c has no finite rows.
    expect(firstBatch(model).pathOffsets.length).toBe(3);
  });
});
