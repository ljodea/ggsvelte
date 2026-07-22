import { describe, expect, it } from "bun:test";

import { buildCandidateStore } from "../../src/candidate-store.ts";
import { data, scene, sceneWithPoints } from "./fixtures.ts";

describe("CandidateStore", () => {
  const store = buildCandidateStore(scene(), {
    epoch: 7,
    datum: ({ candidateIndex }) => data[candidateIndex]!,
  });

  it("defers semantic/index construction until interaction first reads the store", () => {
    let resolutions = 0;
    const lazy = buildCandidateStore(scene(), {
      datum: ({ candidateIndex }) => {
        resolutions++;
        return data[candidateIndex]!;
      },
    });
    expect(lazy.size).toBe(5);
    expect(resolutions).toBe(0);
    expect(lazy.candidate(0)?.id).toBe(0);
    expect(resolutions).toBe(5);
  });

  it("hit-tests points through the lazy store with tolerance and panel clipping", () => {
    let resolutions = 0;
    const lazy = buildCandidateStore(sceneWithPoints([[0, 20]]), {
      datum: () => {
        resolutions++;
        return {};
      },
    });
    expect(resolutions).toBe(0);
    expect(lazy.hitTest(5.5, 20)?.id).toBe(0);
    expect(resolutions).toBe(1);
    expect(lazy.hitTest(6.5, 20)).toBeNull();
    // The rendered mark is clipped at the panel edge even though its radius
    // extends around the point anchor.
    expect(lazy.hitTest(-1, 20)).toBeNull();

    const exactRadius = buildCandidateStore(sceneWithPoints([[10, 20]]), {
      hitTolerance: 0,
    });
    expect(exactRadius.hitTest(12.5, 20)?.id).toBe(0);
    expect(exactRadius.hitTest(13.5, 20)).toBeNull();
  });

  it("hitTest follows reverse paint order for overlapping exact geometry", () => {
    const points = scene();
    points.batches = [
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
        kind: "points",
        layerIndex: 1,
        panelIndex: 0,
        positions: new Float32Array([14, 20]),
        rowIndex: new Uint32Array([1]),
        size: 5,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
    ];
    // The later-painted point wins even though the earlier point is closer.
    expect(buildCandidateStore(points).hitTest(10, 20)?.id).toBe(1);

    const rects = scene();
    rects.batches = [0, 1].map((layerIndex) => ({
      kind: "rects" as const,
      layerIndex,
      panelIndex: 0,
      rects: new Float32Array([10, 10, 40, 40]),
      rowIndex: new Uint32Array([layerIndex]),
      fill: null,
      alpha: 1,
    }));
    expect(buildCandidateStore(rects).hitTest(20, 20)?.id).toBe(1);
    expect(buildCandidateStore(rects).hitTest(5, 20)).toBeNull();
    rects.batches = [
      {
        kind: "rects",
        layerIndex: 0,
        panelIndex: 0,
        rects: new Float32Array([50, 50, -40, -40]),
        rowIndex: new Uint32Array([0]),
        fill: null,
        alpha: 1,
      },
    ];
    const negativeRectStore = buildCandidateStore(rects);
    expect(negativeRectStore.hitTest(20, 20)?.id).toBe(0);
    expect(negativeRectStore.queryRect(15, 15, 25, 25)).toEqual(new Uint32Array([0]));

    const segments = scene();
    segments.batches = [0, 1].map((layerIndex) => ({
      kind: "segments" as const,
      layerIndex,
      panelIndex: 0,
      segments: new Float32Array([10, 20, 80, 20]),
      rowIndex: new Uint32Array([layerIndex]),
      stroke: null,
      linewidth: 2,
      alpha: 1,
    }));
    expect(buildCandidateStore(segments, { hitTolerance: 2 }).hitTest(40, 22)?.id).toBe(1);
    expect(buildCandidateStore(segments, { hitTolerance: 2 }).hitTest(40, 24)).toBeNull();
  });

  it("hitTest resolves paths by paint order and stable nearest vertex, never glyphs", () => {
    const paths = scene();
    paths.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([10, 20, 30, 20, 10, 20, 30, 20]),
        rowIndex: new Uint32Array([0, 1, 2, 3]),
        pathOffsets: new Uint32Array([0, 2, 4]),
        strokes: [null, null],
        linewidth: 2,
        alpha: 1,
        curve: "linear",
      },
    ];
    // Later subpath wins; an equidistant edge chooses its first vertex.
    expect(buildCandidateStore(paths).hitTest(20, 20)?.id).toBe(2);

    const folded = scene();
    folded.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([0, 10, 20, 10, 10, 11]),
        rowIndex: new Uint32Array([0, 1, 2]),
        pathOffsets: new Uint32Array([0, 3]),
        strokes: [null],
        linewidth: 2,
        alpha: 1,
        curve: "linear",
      },
    ];
    // Both edges are in tolerance. Paint compatibility chooses the first edge,
    // then its first endpoint on an equal endpoint-distance tie.
    expect(buildCandidateStore(folded).hitTest(10, 10)?.id).toBe(0);

    const area = scene();
    area.batches = [
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
    const areaStore = buildCandidateStore(area);
    expect(areaStore.hitTest(25, 25)?.id).toBe(0);
    // Filled areas have no visible stroke; pointer tolerance must not create
    // an invisible interactive band outside the polygon.
    expect(areaStore.hitTest(50, 18)).toBeNull();

    const glyphs = scene();
    glyphs.batches = [
      {
        kind: "glyphs",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([20, 20]),
        rowIndex: new Uint32Array([0]),
        text: ["label"],
        fill: null,
        size: 12,
        alpha: 1,
      },
    ];
    expect(buildCandidateStore(glyphs).hitTest(20, 20)).toBeNull();
  });

  it("chooses the nearest semantic anchor on a shared tessellated edge", () => {
    const tessellated = scene();
    tessellated.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([0, 10, 10, 10, 20, 10, 30, 10]),
        rowIndex: new Uint32Array([0, 1, 1, 1]),
        semanticAnchors: new Uint8Array([1, 0, 0, 1]),
        semanticIndex: new Uint32Array([0, 1, 1, 1]),
        pathOffsets: new Uint32Array([0, 4]),
        strokes: [null],
        linewidth: 2,
        alpha: 1,
        curve: "linear",
      },
    ];
    const tessellatedStore = buildCandidateStore(tessellated, {
      datum: ({ primitiveIndex }) => ({ xValue: primitiveIndex }),
    });

    expect(tessellatedStore.hitTest(2, 10)).toMatchObject({ rowIndex: 0, primitiveIndex: 0 });
    expect(tessellatedStore.hitTest(28, 10)).toMatchObject({ rowIndex: 1, primitiveIndex: 3 });
  });

  it("hitTest preserves exact containment when semantic nearest is too far", () => {
    const largeRect = scene();
    largeRect.batches = [
      {
        kind: "rects",
        layerIndex: 0,
        panelIndex: 0,
        rects: new Float32Array([10, 10, 160, 90]),
        rowIndex: new Uint32Array([0]),
        fill: null,
        alpha: 1,
      },
    ];
    const candidates = buildCandidateStore(largeRect);
    expect(candidates.nearest(20, 90, { mode: "xy", maxDistance: 5 })).toBeNull();
    expect(candidates.hitTest(20, 90)?.id).toBe(0);
  });

  it("uses exact geometry for containment and rectangle intersections", () => {
    const rectScene = scene();
    rectScene.batches = [
      {
        kind: "rects",
        layerIndex: 0,
        panelIndex: 0,
        rects: new Float32Array([20, 20, 40, 40]),
        rowIndex: new Uint32Array([0]),
        fill: null,
        alpha: 1,
      },
    ];
    const rectStore = buildCandidateStore(rectScene, { datum: () => ({ xValue: 1, yValue: 2 }) });
    expect(rectStore.nearest(22, 55, { mode: "exact", maxDistance: 0 })?.id).toBe(0);
    expect(rectStore.queryRect(15, 30, 25, 35)).toEqual(new Uint32Array([0]));
    expect(rectStore.candidate(0)?.autoMode).toBe("exact");
    expect(rectStore.nearest(22, 55, { mode: "auto", maxDistance: 0 })?.mode).toBe("exact");
  });

  it("infers a semantic dominant axis for standalone segments", () => {
    const segmentScene = scene();
    segmentScene.batches = [
      {
        kind: "segments",
        layerIndex: 0,
        panelIndex: 0,
        segments: new Float32Array([20, 0, 20, 100, 0, 40, 100, 40]),
        rowIndex: new Uint32Array([0, 1]),
        stroke: null,
        linewidth: 1,
        alpha: 1,
      },
    ];
    const segmentStore = buildCandidateStore(segmentScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: primitiveIndex === 0 ? 20 : null,
        yValue: primitiveIndex === 1 ? 40 : null,
      }),
    });

    expect(segmentStore.candidate(0)?.autoMode).toBe("x");
    expect(segmentStore.candidate(1)?.autoMode).toBe("y");
    expect(segmentStore.nearest(22, 90, { mode: "auto", maxDistance: 3 })).toMatchObject({
      id: 0,
      mode: "x",
    });
    expect(segmentStore.nearest(90, 42, { mode: "auto", maxDistance: 3 })).toMatchObject({
      id: 1,
      mode: "y",
    });
  });

  it("uses polygon containment for exact filled-path lookup", () => {
    const areaScene = scene();
    areaScene.batches = [
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
    const areaStore = buildCandidateStore(areaScene);
    expect(areaStore.nearest(25, 25, { mode: "exact", maxDistance: 0 })?.id).toBe(0);
  });

  it("does not form stroke segments across multi-subpath boundaries", () => {
    // Two disjoint horizontal strokes. The last vertex of path 0 is (20,0);
    // the first of path 1 is (0,50). A false edge between them would pass near (10,25).
    const multi = scene();
    multi.batches = [
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
    const multiStore = buildCandidateStore(multi, {
      datum: ({ primitiveIndex }) => ({
        xValue: primitiveIndex,
        yValue: primitiveIndex < 3 ? 0 : 50,
        // Force exact geometry so pathRange/samePath are on the refine path.
        autoMode: "exact",
      }),
    });
    // Midpoint of the false cross-boundary edge must not hit.
    expect(multiStore.nearest(10, 25, { mode: "exact", maxDistance: 3 })).toBeNull();
    // Real stroke on path 0 (probe near the middle vertex of the first subpath).
    const onPath0 = multiStore.nearest(10, 1, { mode: "exact", maxDistance: 3 });
    expect(onPath0).not.toBeNull();
    expect(onPath0!.id).toBeLessThan(3);
    // Real stroke on path 1.
    const onPath1 = multiStore.nearest(10, 51, { mode: "exact", maxDistance: 3 });
    expect(onPath1).not.toBeNull();
    expect(onPath1!.id).toBeGreaterThanOrEqual(3);
    // Brush covering only the false edge should be empty; covering a real edge is not.
    expect(multiStore.queryRect(8, 20, 12, 30)).toEqual(new Uint32Array());
    const brushed = multiStore.queryRect(8, -2, 12, 2);
    expect([...brushed].every((id) => id < 3)).toBe(true);
    expect(brushed.length).toBeGreaterThan(0);
  });

  it("rejects segment bounding boxes that do not geometrically intersect a brush", () => {
    const segmentScene = scene();
    segmentScene.batches = [
      {
        kind: "segments",
        layerIndex: 0,
        panelIndex: 0,
        segments: new Float32Array([0, 0, 10, 10]),
        rowIndex: new Uint32Array([0]),
        stroke: null,
        linewidth: 1,
        alpha: 1,
      },
    ];
    const segmentStore = buildCandidateStore(segmentScene);
    expect(segmentStore.queryRect(0, 9, 1, 10)).toEqual(new Uint32Array());
    expect(segmentStore.queryRect(4, 4, 6, 6)).toEqual(new Uint32Array([0]));
  });

  it("releases lazy resolvers and initialized candidate arrays on dispose", () => {
    let resolutions = 0;
    const lazy = buildCandidateStore(scene(), {
      datum: () => {
        resolutions++;
        return {};
      },
    });
    lazy.dispose();
    expect(lazy.size).toBe(0);
    expect(lazy.candidate(0)).toBeNull();
    expect(lazy.x).toHaveLength(0);
    expect(resolutions).toBe(0);

    const initialized = buildCandidateStore(scene());
    expect(initialized.candidate(0)).not.toBeNull();
    initialized.dispose();
    expect(initialized.size).toBe(0);
    expect(initialized.candidate(0)).toBeNull();
    expect(initialized.x).toHaveLength(0);
  });

  it("owns typed anchors and exposes stable candidate facts", () => {
    expect(store.x).toBeInstanceOf(Float32Array);
    expect(store.y).toBeInstanceOf(Float32Array);
    expect(store.size).toBe(5);
    expect(store.candidate(0)).toMatchObject({
      id: 0,
      epoch: 7,
      panelId: "panel:all",
      rowIndex: 0,
      seriesId: 0,
    });
  });

  it("finds dominant-axis and euclidean nearest candidates", () => {
    expect(store.nearest(12, 39, { mode: "x", maxDistance: 3 })?.id).toBe(1);
    expect(store.nearest(48, 31, { mode: "xy", maxDistance: 4 })?.id).toBe(2);
    expect(store.nearest(80, 80, { mode: "xy", maxDistance: 2 })).toBeNull();
  });

  it("excludes invalid logical values from dominant-axis inspection", () => {
    const invalid = [
      ...data.slice(0, 3),
      { xValue: Number.NaN, yValue: 2, seriesId: 9 },
      ...data.slice(3),
    ];
    const withInvalid = scene();
    const points = withInvalid.batches[0]!;
    if (points.kind !== "points") throw new Error("fixture");
    points.positions = new Float32Array([...points.positions, 80, 2]);
    points.rowIndex = new Uint32Array([...points.rowIndex, 5]);
    const invalidStore = buildCandidateStore(withInvalid, {
      datum: ({ candidateIndex }) => invalid[candidateIndex]!,
    });
    expect(invalidStore.nearest(80, 2, { mode: "x", maxDistance: 1 })).toBeNull();
  });

  it("returns a compact canonical bucket and one representative per series", () => {
    const grouped = store.group(1, "x");
    expect(grouped?.axisValue).toEqual(new Date(0));
    expect(grouped?.memberIds).toEqual(new Uint32Array([3, 1]));
    expect(grouped?.focusId).toBe(1);
    expect(grouped?.range.end).toBeGreaterThan(grouped?.range.start ?? 0);
  });

  it("cycles coincident marks, traverses deterministically, and returns integer rect ids", () => {
    // Coincident pair at (10, 25): paint/source order is ids 3 then 4.
    expect(store.cycle(3, 1)).toBe(4);
    expect(store.cycle(4, 1)).toBe(3);
    expect(store.cycle(3, -1)).toBe(4);
    expect(store.cycle(4, -1)).toBe(3);
    expect(store.cycle(3, 2)).toBe(3);
    expect(store.cycle(3, 0)).toBe(3);
    // Singleton stack: step is a no-op (no retained one-element stack required).
    expect(store.cycle(0, 1)).toBe(0);
    expect(store.cycle(0, -3)).toBe(0);
    // Invalid seed returns null (bounds + non-integer, matching other store entry points).
    expect(store.cycle(-1, 1)).toBeNull();
    expect(store.cycle(5, 1)).toBeNull();
    expect(store.cycle(1.5, 1)).toBeNull();
    expect(store.cycle(Number.NaN, 1)).toBeNull();
    // Non-finite / non-integral step falls back to the seed (prior contract).
    expect(store.cycle(3, Number.NaN)).toBe(3);
    expect(store.cycle(3, Number.POSITIVE_INFINITY)).toBe(3);
    expect(store.cycle(3, 1.5)).toBe(3);
    expect(store.traverse(0, "down")).toBe(4);
    expect(store.queryRect(5, 15, 15, 45)).toEqual(new Uint32Array([0, 3, 4, 1]));
  });

  // Traversal order for this fixture (panel → y → x → batch → primitive):
  // [0, 3, 4, 2, 1]
  it("walks next/previous with wrap-around and falls back for unknown start ids", () => {
    expect(store.traverse(null, "next")).toBe(0);
    expect(store.traverse(null, "previous")).toBe(0);
    expect(store.traverse(0, "first")).toBe(0);
    expect(store.traverse(0, "last")).toBe(1);
    expect(store.traverse(0, "next")).toBe(3);
    expect(store.traverse(3, "next")).toBe(4);
    expect(store.traverse(4, "next")).toBe(2);
    expect(store.traverse(2, "next")).toBe(1);
    expect(store.traverse(1, "next")).toBe(0);
    expect(store.traverse(0, "previous")).toBe(1);
    expect(store.traverse(1, "previous")).toBe(2);
    expect(store.traverse(2, "previous")).toBe(4);
    // CandidateStore owns modular keyboard jumps; callers do not materialize
    // traversal order to calculate an index themselves.
    expect(store.traverse(null, "next", 2)).toBe(3);
    expect(store.traverse(0, "next", 3)).toBe(2);
    expect(store.traverse(0, "previous", 2)).toBe(2);
    expect(store.traverse(999, "next")).toBe(0);
    expect(store.traverse(-1, "previous")).toBe(0);
  });

  it("keeps spatial directions independent of sequential rank", () => {
    // Spatial uses geometry, not traversal order.
    expect(store.traverse(0, "down")).toBe(4);
    expect(store.traverse(0, "right")).toBe(2);
    // From (50,30), nearest left is the coincident pair at x=10; topmost id 4 wins.
    expect(store.traverse(2, "left")).toBe(4);
    expect(store.traverse(1, "up")).toBe(2);
  });
});
