import { describe, expect, it } from "bun:test";

import { createHitGeometry } from "../../src/candidate-hit-geometry.ts";
import { buildCandidateStoreIndexes } from "../../src/candidate-store-indexes.ts";
import { scene } from "./fixtures.ts";

describe("Mark hit-geometry table", () => {
  it("rects: contains inside, rejects outside, AABB matches extents (incl. negative size)", () => {
    const plot = scene();
    plot.batches = [
      {
        kind: "rects",
        layerIndex: 0,
        panelIndex: 0,
        rects: new Float32Array([10, 10, 40, 40, 50, 50, -40, -40]),
        rowIndex: new Uint32Array([0, 1]),
        fill: null,
        alpha: 1,
      },
    ];
    const indexes = buildCandidateStoreIndexes(plot);
    const hit = createHitGeometry(indexes);
    const containment = new Map<string, boolean>();

    expect(hit.contains(0, 20, 20, containment)).toBe(true);
    expect(hit.distance(0, 20, 20, containment)).toBe(0);
    expect(hit.contains(0, 5, 20, containment)).toBe(false);
    expect(hit.distance(0, 5, 20, containment)).toBeNull();
    expect(hit.intersects(0, 15, 15, 25, 25)).toBe(true);
    expect(hit.intersects(0, 0, 0, 5, 5)).toBe(false);
    expect(hit.aabb(0)).toEqual([10, 10, 50, 50]);

    // Negative width/height still forms the same axis-aligned box.
    expect(hit.contains(1, 20, 20, containment)).toBe(true);
    expect(hit.aabb(1)).toEqual([10, 10, 50, 50]);
    expect(hit.intersects(1, 15, 15, 25, 25)).toBe(true);
  });

  it("points: circle distance respects size + tolerance; glyphs never hit", () => {
    const plot = scene();
    plot.batches = [
      {
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([10, 20]),
        rowIndex: new Uint32Array([0]),
        size: 5,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
      {
        kind: "glyphs",
        layerIndex: 1,
        panelIndex: 0,
        positions: new Float32Array([40, 20]),
        rowIndex: new Uint32Array([1]),
        text: ["label"],
        fill: null,
        size: 12,
        alpha: 1,
      },
    ];
    const indexes = buildCandidateStoreIndexes(plot, { hitTolerance: 2 });
    const hit = createHitGeometry(indexes);
    const containment = new Map<string, boolean>();

    expect(hit.distance(0, 10, 20, containment)).toBe(0);
    expect(hit.distance(0, 16, 20, containment)).toBe(6);
    expect(hit.distance(0, 18, 20, containment)).toBeNull();
    expect(hit.contains(0, 10, 20, containment)).toBe(false);
    expect(hit.intersects(0, 9, 19, 11, 21)).toBe(true);
    expect(hit.aabb(0)).toEqual([3, 13, 17, 27]);

    expect(hit.distance(1, 40, 20, containment)).toBeNull();
    expect(hit.contains(1, 40, 20, containment)).toBe(false);
    expect(hit.intersects(1, 39, 19, 41, 21)).toBe(true);
    expect(hit.aabb(1)).toEqual([26, 6, 54, 34]);
  });

  it("segments: stroke proximity + exact segment/rect intersection (not bbox)", () => {
    const plot = scene();
    plot.batches = [
      {
        kind: "segments",
        layerIndex: 0,
        panelIndex: 0,
        segments: new Float32Array([0, 0, 10, 10]),
        rowIndex: new Uint32Array([0]),
        stroke: null,
        linewidth: 2,
        alpha: 1,
      },
    ];
    const indexes = buildCandidateStoreIndexes(plot, { hitTolerance: 0 });
    const hit = createHitGeometry(indexes);
    const containment = new Map<string, boolean>();

    expect(hit.distance(0, 5, 5, containment)).toBe(0);
    expect(hit.distance(0, 5, 7, containment)).toBeNull();
    expect(hit.intersects(0, 4, 4, 6, 6)).toBe(true);
    // Axis-aligned brush in the segment AABB corner that misses the diagonal.
    expect(hit.intersects(0, 0, 9, 1, 10)).toBe(false);
    expect(hit.aabb(0)).toEqual([-1, -1, 11, 11]);
  });

  it("paths: filled containment vs stroked edge proximity; no cross-subpath edges", () => {
    const filled = scene();
    filled.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([20, 20, 80, 20, 50, 80]),
        rowIndex: new Uint32Array([0, 1, 2]),
        pathOffsets: new Uint32Array([0, 3]),
        strokes: [null],
        fills: [null],
        closed: true,
        linewidth: 0,
        alpha: 1,
        curve: "linear",
      },
    ];
    const filledHit = createHitGeometry(buildCandidateStoreIndexes(filled));
    // pathContainment is per query point (one Map per hitTest/nearest call).
    expect(filledHit.contains(0, 25, 25, new Map())).toBe(true);
    expect(filledHit.distance(0, 25, 25, new Map())).not.toBeNull();
    // Outside the polygon: no invisible stroke band when fills are present.
    expect(filledHit.distance(0, 50, 18, new Map())).toBeNull();

    const stroked = scene();
    stroked.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([0, 0, 10, 0, 20, 0, 0, 50, 10, 50, 20, 50]),
        rowIndex: new Uint32Array([0, 1, 2, 3, 4, 5]),
        pathOffsets: new Uint32Array([0, 3, 6]),
        strokes: [null, null],
        linewidth: 2,
        alpha: 1,
        curve: "linear",
      },
    ];
    const strokedHit = createHitGeometry(buildCandidateStoreIndexes(stroked, { hitTolerance: 3 }));
    const strokeContainment = new Map<string, boolean>();
    // Midpoint of a false cross-subpath edge must not hit.
    expect(strokedHit.distance(1, 10, 25, strokeContainment)).toBeNull();
    expect(strokedHit.distance(1, 10, 1, strokeContainment)).not.toBeNull();
    expect(strokedHit.intersects(1, 8, -2, 12, 2)).toBe(true);
    expect(strokedHit.intersects(1, 8, 20, 12, 30)).toBe(false);
  });
});
