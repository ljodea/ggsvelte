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

    const inside = hit.probePoint(20, 20);
    expect(inside.contains(0)).toBe(true);
    expect(inside.distance(0)).toBe(0);
    const outside = hit.probePoint(5, 20);
    expect(outside.contains(0)).toBe(false);
    expect(outside.distance(0)).toBeNull();
    expect(hit.probeRect(15, 15, 25, 25).intersects(0)).toBe(true);
    expect(hit.probeRect(0, 0, 5, 5).intersects(0)).toBe(false);
    expect(hit.aabb(0)).toEqual([10, 10, 50, 50]);

    // Negative width/height still forms the same axis-aligned box.
    expect(inside.contains(1)).toBe(true);
    expect(hit.aabb(1)).toEqual([10, 10, 50, 50]);
    expect(hit.probeRect(15, 15, 25, 25).intersects(1)).toBe(true);
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

    const center = hit.probePoint(10, 20);
    expect(center.distance(0)).toBe(0);
    expect(center.contains(0)).toBe(false);
    expect(hit.probePoint(16, 20).distance(0)).toBe(6);
    expect(hit.probePoint(18, 20).distance(0)).toBeNull();
    expect(hit.probeRect(9, 19, 11, 21).intersects(0)).toBe(true);
    expect(hit.aabb(0)).toEqual([3, 13, 17, 27]);

    const glyphCenter = hit.probePoint(40, 20);
    expect(glyphCenter.distance(1)).toBeNull();
    expect(glyphCenter.contains(1)).toBe(false);
    expect(hit.probeRect(39, 19, 41, 21).intersects(1)).toBe(true);
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

    expect(hit.probePoint(5, 5).distance(0)).toBe(0);
    expect(hit.probePoint(5, 7).distance(0)).toBeNull();
    expect(hit.probeRect(4, 4, 6, 6).intersects(0)).toBe(true);
    // Axis-aligned brush in the segment AABB corner that misses the diagonal.
    expect(hit.probeRect(0, 9, 1, 10).intersects(0)).toBe(false);
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
    const insideFill = filledHit.probePoint(25, 25);
    expect(insideFill.contains(0)).toBe(true);
    expect(insideFill.distance(0)).not.toBeNull();
    // Outside the polygon: no invisible stroke band when fills are present.
    expect(filledHit.probePoint(50, 18).distance(0)).toBeNull();

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
    // Midpoint of a false cross-subpath edge must not hit.
    expect(strokedHit.probePoint(10, 25).distance(1)).toBeNull();
    expect(strokedHit.probePoint(10, 1).distance(1)).not.toBeNull();
    expect(strokedHit.probeRect(8, -2, 12, 2).intersects(1)).toBe(true);
    expect(strokedHit.probeRect(8, 20, 12, 30).intersects(1)).toBe(false);
  });

  it("paths: a rect probe caches fill containment per subpath, scoped to that probe", () => {
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
    const batch = filled.batches[0]!;
    const hit = createHitGeometry(buildCandidateStoreIndexes(filled));

    // Rect (40,40)-(60,50): center inside the fill, no anchor or edge in rect.
    const probe = hit.probeRect(40, 40, 60, 50);
    expect(probe.intersects(0)).toBe(true);

    // Same probe, second candidate on the same subpath: the cached containment
    // answers without re-reading geometry — move the polygon away and the
    // probe still reports the cached verdict.
    if (batch.kind !== "paths") throw new Error("expected paths batch");
    const original = batch.positions.slice();
    batch.positions.set([200, 200, 260, 200, 230, 260]);
    expect(probe.intersects(1)).toBe(true);
    batch.positions.set(original);

    // A fresh probe for a different rect never inherits that verdict: center
    // (74,74) sits outside the fill, so a stale shared cache would say true.
    expect(hit.probeRect(70, 70, 78, 78).intersects(0)).toBe(false);

    // Anchor-in-rect early return stays cheap: it answers before any fill
    // containment is computed (rect contains the (20,20) anchor).
    expect(hit.probeRect(15, 15, 25, 25).intersects(0)).toBe(true);

    // Point probes cache the point-containment predicate the same way —
    // scoped to their own probe, never shared with rect probes.
    const pointProbe = hit.probePoint(25, 25);
    expect(pointProbe.contains(0)).toBe(true);
    batch.positions.set([200, 200, 260, 200, 230, 260]);
    expect(pointProbe.contains(1)).toBe(true);
    batch.positions.set(original);
    expect(hit.probePoint(50, 18).contains(0)).toBe(false);
  });
});
