import { describe, expect, it, spyOn } from "bun:test";

import { buildCandidateStore } from "../../src/candidate-store.ts";
import type { Scene } from "../../src/scene.ts";
import { scene, sceneWithPoints } from "./fixtures.ts";

describe("candidate spatial query hot path (issue #214)", () => {
  function largePointScene(count: number): Scene {
    const cols = Math.ceil(Math.sqrt(count));
    const points: (readonly [number, number])[] = [];
    for (let i = 0; i < count; i++) {
      points.push([(i % cols) * 10, Math.floor(i / cols) * 10]);
    }
    return sceneWithPoints(points);
  }

  it("xy nearest does not Math.hypot every candidate on a large point cloud", () => {
    // Complexity guard: linear nearest is O(n) hypot; spatial shortlist is O(log n + k).
    const count = 8_000;
    const store = buildCandidateStore(largePointScene(count), {
      datum: ({ primitiveIndex }) => ({
        xValue: primitiveIndex,
        yValue: primitiveIndex,
      }),
    });
    void store.x;

    const originalHypot = Math.hypot;
    let hypotCalls = 0;
    const hypotSpy = spyOn(Math, "hypot").mockImplementation(function (
      this: void,
      ...args: Parameters<typeof Math.hypot>
    ) {
      hypotCalls++;
      return originalHypot(...args);
    });
    try {
      // Target near (10,10) — grid id 1 at (10,0) or id ~cols at (0,10); nearest is id 1 or nearby.
      const hit = store.nearest(10, 10, { mode: "xy", maxDistance: 6 });
      expect(hit).not.toBeNull();
      expect(hit!.distance).toBeLessThanOrEqual(6);
      // Shortlist must be far smaller than a full scan (budget leaves room for refine + ties).
      expect(hypotCalls).toBeLessThan(200);
      expect(hypotCalls).toBeLessThan(count / 10);
    } finally {
      hypotSpy.mockRestore();
    }
  });

  it("hitTest does not expand a dense point query by one oversized point", () => {
    const count = 10_000;
    const dense = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      dense[i * 2] = i % 100;
      dense[i * 2 + 1] = Math.floor(i / 100);
    }
    const plotScene = scene();
    plotScene.batches = [
      {
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions: dense,
        rowIndex: Uint32Array.from({ length: count }, (_, index) => index),
        size: 1,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
      {
        kind: "points",
        layerIndex: 1,
        panelIndex: 0,
        positions: new Float32Array([190, 100]),
        rowIndex: new Uint32Array([count]),
        size: 1_000,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
    ];
    const store = buildCandidateStore(plotScene);
    void store.x;
    const hypot = spyOn(Math, "hypot");
    hypot.mockClear();
    expect(store.hitTest(10, 10)?.id).toBe(count);
    expect(hypot).toHaveBeenCalledTimes(1);
    hypot.mockRestore();
  });

  it("queryRect does not read every batch for a tight brush on a large point cloud", () => {
    const count = 8_000;
    const cols = Math.ceil(Math.sqrt(count));
    const positions = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      positions[i * 2] = (i % cols) * 10;
      positions[i * 2 + 1] = Math.floor(i / cols) * 10;
    }
    const rawBatches: Scene["batches"] = [
      {
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions,
        rowIndex: Uint32Array.from({ length: count }, (_, index) => index),
        size: 3,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
    ];
    let batchIndexReads = 0;
    const batches = new Proxy(rawBatches, {
      get(target, property, receiver): unknown {
        if (typeof property === "string" && /^\d+$/.test(property)) batchIndexReads++;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    const plotScene = scene();
    plotScene.batches = batches;
    const store = buildCandidateStore(plotScene);
    // Construction may touch batches; only police the query.
    void store.x;
    batchIndexReads = 0;

    const hits = store.queryRect(5, 5, 25, 25);
    // Grid points in [5,25]² with 10px spacing: (10,10), (20,10), (10,20), (20,20) → 4 hits.
    expect([...hits].toSorted((a, b) => a - b)).toEqual([
      cols + 1,
      cols + 2,
      2 * cols + 1,
      2 * cols + 2,
    ]);
    // Linear queryRect consulted scene.batches once per candidate; shortlist stays O(k).
    expect(batchIndexReads).toBeLessThan(200);
    expect(batchIndexReads).toBeLessThan(count / 10);
  });

  it("preserves topmost tie-break and panel filter with spatial shortlist", () => {
    const multi = scene();
    multi.panels = [
      {
        id: "a",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        strip: "",
        axisX: [],
        axisY: [],
        grid: { x: [], y: [] },
      },
      {
        id: "b",
        x: 200,
        y: 0,
        width: 100,
        height: 100,
        strip: "",
        axisX: [],
        axisY: [],
        grid: { x: [], y: [] },
      },
    ];
    multi.batches = [
      {
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([10, 10, 10, 10]),
        rowIndex: new Uint32Array([0, 1]),
        size: 3,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
      {
        kind: "points",
        layerIndex: 1,
        panelIndex: 1,
        positions: new Float32Array([10, 10]),
        rowIndex: new Uint32Array([2]),
        size: 3,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
    ];
    const store = buildCandidateStore(multi);
    // Coincident panel-a points: reverse paint order → higher id wins equal distance.
    expect(store.nearest(10, 10, { mode: "xy", maxDistance: 1 })?.id).toBe(1);
    expect(store.nearest(10, 10, { mode: "xy", maxDistance: 1, panelId: "a" })?.id).toBe(1);
    expect(store.nearest(210, 10, { mode: "xy", maxDistance: 1, panelId: "b" })?.id).toBe(2);
    expect(store.nearest(10, 10, { mode: "xy", maxDistance: 1, panelId: "b" })).toBeNull();
    expect([...store.queryRect(5, 5, 15, 15, "a")].toSorted((a, b) => a - b)).toEqual([0, 1]);
    expect([...store.queryRect(205, 5, 215, 15, "b")]).toEqual([2]);
  });

  it("auto mode still finds dominant-axis point hits far from the probe orthogonally", () => {
    // Boxplot outliers and similar points can inherit autoMode "x": match on
    // dominant-axis distance only. Spatial shortlist must include x/y strips,
    // not only a euclidean square around maxPointReach.
    const plotScene = sceneWithPoints([
      [50, 10],
      [50, 200],
    ]);
    const store = buildCandidateStore(plotScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: 50,
        yValue: primitiveIndex === 0 ? 10 : 200,
        autoMode: "x",
      }),
    });
    // Probe at same x as both points, but 150px from the nearer in y — outside
    // size+3 euclidean reach, yet within x maxDistance of 5.
    expect(store.nearest(52, 100, { mode: "auto", maxDistance: 5 })).toMatchObject({
      id: 0,
      mode: "x",
      distance: 2,
    });
    expect(store.nearest(52, 100, { mode: "x", maxDistance: 5 })?.id).toBe(0);
  });

  it("exact nearest still hits large rects whose anchors are far from the probe", () => {
    const rectScene = scene();
    rectScene.batches = [
      {
        kind: "rects",
        layerIndex: 0,
        panelIndex: 0,
        // Wide/tall bar: anchor is center-x / top-y (100, 0).
        rects: new Float32Array([0, 0, 200, 100]),
        rowIndex: new Uint32Array([0]),
        fill: null,
        alpha: 1,
      },
      {
        kind: "points",
        layerIndex: 1,
        panelIndex: 0,
        // Far from the rect interior probe used below.
        positions: new Float32Array([5, 5]),
        rowIndex: new Uint32Array([1]),
        size: 2,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
    ];
    const store = buildCandidateStore(rectScene, {
      datum: ({ kind }) => ({ xValue: 1, yValue: 2, autoMode: kind === "rects" ? "exact" : "xy" }),
    });
    // Probe inside the bar, far from its top-center anchor — spatial shortlist by
    // anchor radius alone would miss this unless extended geometry is refined.
    expect(store.nearest(150, 80, { mode: "exact", maxDistance: 0 })?.id).toBe(0);
    expect(store.queryRect(140, 70, 160, 90)).toEqual(new Uint32Array([0]));
    expect(store.queryRect(0, 0, 10, 10)).toEqual(new Uint32Array([0, 1]));
  });

  it("exact nearest does not refine every far rect on a large bar field", () => {
    // Complexity guard: extended geometry used to force-add all E rects into the
    // shortlist. AABB spatial shortlist must keep refine O(log E + k).
    const count = 4_000;
    const rects = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // 2×2 bars spaced on a grid far from the probe at (5,5).
      const col = i % 50;
      const row = Math.floor(i / 50);
      rects[i * 4] = 100 + col * 10;
      rects[i * 4 + 1] = 100 + row * 10;
      rects[i * 4 + 2] = 2;
      rects[i * 4 + 3] = 2;
    }
    // One bar covering the probe, anchor far from (10,10).
    rects[0] = 0;
    rects[1] = 0;
    rects[2] = 20;
    rects[3] = 20;
    const plotScene = scene();
    plotScene.batches = [
      {
        kind: "rects",
        layerIndex: 0,
        panelIndex: 0,
        rects,
        rowIndex: Uint32Array.from({ length: count }, (_, index) => index),
        fill: null,
        alpha: 1,
      },
    ];
    let batchIndexReads = 0;
    const batches = new Proxy(plotScene.batches, {
      get(target, property, receiver): unknown {
        if (typeof property === "string" && /^\d+$/.test(property)) batchIndexReads++;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    plotScene.batches = batches;
    const store = buildCandidateStore(plotScene, {
      datum: () => ({ xValue: 1, yValue: 2, autoMode: "exact" }),
    });
    void store.x;
    batchIndexReads = 0;

    const hit = store.nearest(10, 10, { mode: "exact", maxDistance: 0 });
    expect(hit?.id).toBe(0);
    // Linear extended scan would touch batches once per rect (~count).
    expect(batchIndexReads).toBeLessThan(200);
    expect(batchIndexReads).toBeLessThan(count / 10);

    batchIndexReads = 0;
    expect(store.hitTest(10, 10)?.id).toBe(0);
    expect(batchIndexReads).toBeLessThan(200);
    expect(batchIndexReads).toBeLessThan(count / 10);
  });

  it("hitTest does not refine every far segment on a dense field", () => {
    const count = 4_000;
    const segments = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const x = 100 + (i % 50) * 10;
      const y = 100 + Math.floor(i / 50) * 10;
      segments.set([x, y, x + 2, y], i * 4);
    }
    segments.set([0, 10, 20, 10], 0);
    const plotScene = scene();
    plotScene.batches = [
      {
        kind: "segments",
        layerIndex: 0,
        panelIndex: 0,
        segments,
        rowIndex: Uint32Array.from({ length: count }, (_, index) => index),
        stroke: null,
        linewidth: 1,
        alpha: 1,
      },
    ];
    let batchIndexReads = 0;
    plotScene.batches = new Proxy(plotScene.batches, {
      get(target, property, receiver): unknown {
        if (typeof property === "string" && /^\d+$/.test(property)) batchIndexReads++;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    const store = buildCandidateStore(plotScene);
    void store.x;
    batchIndexReads = 0;
    expect(store.hitTest(10, 10)?.id).toBe(0);
    expect(batchIndexReads).toBeLessThan(200);
    expect(batchIndexReads).toBeLessThan(count / 10);
  });

  it("one giant rect does not force-refine every small far rect", () => {
    // Size-classed AABB trees: a full-plot bar must not expand the small-bar class.
    const count = 2_000;
    const rects = new Float32Array((count + 1) * 4);
    // Giant bar covering most of the panel (own size class).
    rects[0] = 0;
    rects[1] = 0;
    rects[2] = 200;
    rects[3] = 120;
    for (let i = 0; i < count; i++) {
      const col = i % 40;
      const row = Math.floor(i / 40);
      rects[(i + 1) * 4] = 300 + col * 8;
      rects[(i + 1) * 4 + 1] = 300 + row * 8;
      rects[(i + 1) * 4 + 2] = 2;
      rects[(i + 1) * 4 + 3] = 2;
    }
    const plotScene = scene();
    plotScene.batches = [
      {
        kind: "rects",
        layerIndex: 0,
        panelIndex: 0,
        rects,
        rowIndex: Uint32Array.from({ length: count + 1 }, (_, index) => index),
        fill: null,
        alpha: 1,
      },
    ];
    let batchIndexReads = 0;
    plotScene.batches = new Proxy(plotScene.batches, {
      get(target, property, receiver): unknown {
        if (typeof property === "string" && /^\d+$/.test(property)) batchIndexReads++;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    const store = buildCandidateStore(plotScene, {
      datum: () => ({ xValue: 1, yValue: 2, autoMode: "exact" }),
    });
    void store.x;
    batchIndexReads = 0;
    // Probe on the giant bar; far small rects must stay out of refine.
    expect(store.nearest(100, 60, { mode: "exact", maxDistance: 0 })?.id).toBe(0);
    expect(batchIndexReads).toBeLessThan(50);
    expect(batchIndexReads).toBeLessThan(count / 20);
  });

  it("exact nearest hits a stroked path mid-edge via incident-edge AABB", () => {
    // Long horizontal polyline: probe near the middle of an interior edge.
    const n = 20;
    const positions = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      positions[i * 2] = i * 10;
      positions[i * 2 + 1] = 50;
    }
    const plotScene = scene();
    plotScene.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions,
        rowIndex: Uint32Array.from({ length: n }, (_, index) => index),
        pathOffsets: new Uint32Array([0, n]),
        strokes: [null],
        linewidth: 2,
        alpha: 1,
        curve: "linear",
      },
    ];
    const store = buildCandidateStore(plotScene, {
      datum: () => ({ xValue: 1, yValue: 2, autoMode: "exact" }),
    });
    // Midpoint of edge between vertices 5 (50,50) and 6 (60,50).
    const hit = store.nearest(55, 51, { mode: "exact", maxDistance: 3 });
    expect(hit).not.toBeNull();
    expect(hit!.id === 5 || hit!.id === 6).toBe(true);
  });

  it("exact nearest does not refine every vertex of a far dense stroked polyline", () => {
    // Complexity guard: full-subpath AABB tagged every vertex of a long series
    // into one giant size class → Θ(V) refine. Incident-edge AABB keeps shortlist
    // O(log V + k) for a distant probe.
    const count = 4_000;
    const positions = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      // Dense polyline far from the origin probe.
      positions[i * 2] = 200 + (i % 100);
      positions[i * 2 + 1] = 200 + Math.floor(i / 100);
    }
    // Short local stroke near (10,10) so nearest still hits something real.
    positions[0] = 0;
    positions[1] = 10;
    positions[2] = 20;
    positions[3] = 10;
    const plotScene = scene();
    plotScene.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions,
        rowIndex: Uint32Array.from({ length: count }, (_, index) => index),
        pathOffsets: new Uint32Array([0, count]),
        strokes: [null],
        linewidth: 2,
        alpha: 1,
        curve: "linear",
      },
    ];
    let batchIndexReads = 0;
    plotScene.batches = new Proxy(plotScene.batches, {
      get(target, property, receiver): unknown {
        if (typeof property === "string" && /^\d+$/.test(property)) batchIndexReads++;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    const store = buildCandidateStore(plotScene, {
      datum: () => ({ xValue: 1, yValue: 2, autoMode: "exact" }),
    });
    void store.x;
    batchIndexReads = 0;

    const hit = store.nearest(10, 10, { mode: "exact", maxDistance: 3 });
    expect(hit).not.toBeNull();
    expect(hit!.id).toBeLessThan(4);
    // Linear extended scan would touch the batch once per far vertex (~count).
    expect(batchIndexReads).toBeLessThan(200);
    expect(batchIndexReads).toBeLessThan(count / 10);

    batchIndexReads = 0;
    expect(store.hitTest(10, 10)?.id).toBeLessThan(4);
    expect(batchIndexReads).toBeLessThan(200);
    expect(batchIndexReads).toBeLessThan(count / 10);
  });

  it("filled path still uses subpath AABB so interior probes hit", () => {
    // Regression: stroke edge boxes must not replace fill containment shortlist.
    const areaScene = scene();
    areaScene.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        // Large triangle; probe deep inside, far from all vertices.
        positions: new Float32Array([0, 0, 200, 0, 100, 200]),
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
    const areaStore = buildCandidateStore(areaScene, {
      datum: () => ({ xValue: 1, yValue: 2, autoMode: "exact" }),
    });
    expect(areaStore.nearest(100, 50, { mode: "exact", maxDistance: 0 })?.id).toBeDefined();
    expect(areaStore.hitTest(100, 50)?.id).toBeDefined();
  });

  it("builds stores that include glyph batches without throwing", () => {
    const plotScene = scene();
    plotScene.batches = [
      {
        kind: "glyphs",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([10, 20, 30, 40]),
        rowIndex: new Uint32Array([0, 1]),
        texts: ["a", "b"],
        color: null,
        size: 12,
        anchor: "start",
        alpha: 1,
      },
    ];
    const store = buildCandidateStore(plotScene, {
      datum: () => ({ xValue: 1, yValue: 2 }),
    });
    expect(store.size).toBe(2);
    expect(store.nearest(10, 20, { mode: "exact", maxDistance: 0 })).toBeNull();
  });
});
