import { describe, expect, it, spyOn } from "bun:test";

import {
  buildCandidateStore,
  canonicalAxisToken,
  type CandidateDatum,
} from "../src/candidate-store.ts";
import type { Scene } from "../src/scene.ts";

function scene(): Scene {
  return {
    width: 200,
    height: 120,
    panels: [
      {
        id: "panel:all",
        x: 0,
        y: 0,
        width: 200,
        height: 120,
        strip: "",
        axisX: [],
        axisY: [],
        grid: { x: [], y: [] },
      },
    ],
    batches: [
      {
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([10, 20, 10, 40, 50, 30]),
        rowIndex: new Uint32Array([0, 1, 2]),
        size: 3,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
      {
        kind: "points",
        layerIndex: 1,
        panelIndex: 0,
        positions: new Float32Array([10, 25, 10, 25]),
        rowIndex: new Uint32Array([3, 4]),
        size: 3,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
    ],
    axes: { x: { ticks: [], title: "" }, y: { ticks: [], title: "" } },
    grid: { x: [], y: [] },
    legends: [],
    theme: {} as Scene["theme"],
    title: "",
    subtitle: "",
    caption: "",
  };
}

function sceneWithPoints(points: readonly (readonly [number, number])[]): Scene {
  const result = scene();
  result.batches = [
    {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from(points.flat()),
      rowIndex: Uint32Array.from(points.map((_, index) => index)),
      size: 3,
      alpha: 1,
      shape: "circle",
      fill: null,
    },
  ];
  return result;
}

const data: CandidateDatum[] = [
  { xValue: new Date(0), yValue: 20, seriesId: 0, seriesRank: 1 },
  { xValue: new Date(0), yValue: 40, seriesId: 0, seriesRank: 1 },
  { xValue: 50, yValue: 30, seriesId: 0, seriesRank: 1 },
  { xValue: new Date(0), yValue: 25, seriesId: 8, seriesRank: 0 },
  { xValue: new Date(0), yValue: 25, seriesId: 8, seriesRank: 0 },
];

describe("canonicalAxisToken", () => {
  it("normalizes supported values and excludes invalid buckets", () => {
    expect(canonicalAxisToken(new Date(12))).toEqual({ kind: "number", value: 12 });
    expect(canonicalAxisToken(-0)).toEqual({ kind: "number", value: 0 });
    expect(canonicalAxisToken("a")).toEqual({ kind: "string", value: "a" });
    expect(canonicalAxisToken(false)).toEqual({ kind: "boolean", value: false });
    expect(canonicalAxisToken(null)).toBeNull();
    expect(canonicalAxisToken(Number.NaN)).toBeNull();
    expect(canonicalAxisToken(Infinity)).toBeNull();
  });
});

describe("candidate-store public facade", () => {
  it("exposes only buildCandidateStore and canonicalAxisToken at runtime", async () => {
    const facade = await import("../src/candidate-store.ts");
    expect(Object.keys(facade).toSorted()).toEqual(
      ["buildCandidateStore", "canonicalAxisToken"].toSorted(),
    );
  });
});

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
    expect(store.traverse(0, "down")).toBe(3);
    expect(store.queryRect(5, 15, 15, 45)).toEqual(new Uint32Array([0, 3, 4, 1]));
  });

  // Traversal order for this fixture (panel → y → x → batch → primitive):
  // [0, 3, 4, 2, 1]
  it("walks next/previous with wrap-around and falls back for unknown start ids", () => {
    expect(store.traverse(null, "next")).toBe(0);
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
    expect(store.traverse(999, "next")).toBe(0);
    expect(store.traverse(-1, "previous")).toBe(0);
  });

  it("keeps spatial directions independent of sequential rank", () => {
    // Spatial uses geometry, not traversal order.
    expect(store.traverse(0, "down")).toBe(3);
    expect(store.traverse(0, "right")).toBe(2);
    // From (50,30), nearest left is the coincident pair at x=10 (ids 3 then 4); lower id wins ties.
    expect(store.traverse(2, "left")).toBe(3);
    expect(store.traverse(1, "up")).toBe(2);
  });
});

describe("candidate cycle hot path", () => {
  it("uses prebuilt coincident stacks without scanning or indexOf on each step", () => {
    // Three-way stack at (10, 10) plus a singleton — build order is paint/source (id asc).
    const plotScene = sceneWithPoints([
      [10, 10],
      [20, 20],
      [10, 10],
      [10, 10],
    ]);
    const hot = buildCandidateStore(plotScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: primitiveIndex,
        yValue: primitiveIndex,
      }),
    });
    // Force the lazy construction boundary before policing resolution.
    void hot.x;
    const arrayIndexOfSpy = spyOn(Array.prototype, "indexOf").mockImplementation(function (
      this: unknown[],
      ...args: Parameters<Array<unknown>["indexOf"]>
    ) {
      throw new Error(`cycle used Array.indexOf(${String(args[0])})`);
    });
    const typedIndexOfSpy = spyOn(Uint32Array.prototype, "indexOf").mockImplementation(function (
      this: Uint32Array,
      ...args: Parameters<Uint32Array["indexOf"]>
    ) {
      throw new Error(`cycle used Uint32Array.indexOf(${String(args[0])})`);
    });
    try {
      expect(hot.cycle(0, 1)).toBe(2);
      expect(hot.cycle(2, 1)).toBe(3);
      expect(hot.cycle(3, 1)).toBe(0);
      expect(hot.cycle(0, -1)).toBe(3);
      expect(hot.cycle(1, 5)).toBe(1);
      expect(hot.cycle(-1)).toBeNull();
      expect(hot.cycle(99)).toBeNull();
    } finally {
      arrayIndexOfSpy.mockRestore();
      typedIndexOfSpy.mockRestore();
    }
  });
});

describe("candidate traversal hot path", () => {
  it("uses O(1) rank lookup for next/previous without scanning traversal", () => {
    const plotScene = sceneWithPoints([
      [10, 10],
      [20, 20],
      [30, 30],
      [40, 40],
    ]);
    const hot = buildCandidateStore(plotScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: primitiveIndex,
        yValue: primitiveIndex,
      }),
    });
    // Force the lazy construction boundary before policing resolution.
    void hot.x;
    const indexOfSpy = spyOn(Uint32Array.prototype, "indexOf").mockImplementation(function (
      this: Uint32Array,
      ...args: Parameters<Uint32Array["indexOf"]>
    ) {
      throw new Error(`traverse used linear indexOf(${String(args[0])})`);
    });
    try {
      expect(hot.traverse(0, "next")).toBe(1);
      expect(hot.traverse(1, "previous")).toBe(0);
      expect(hot.traverse(3, "next")).toBe(0);
      expect(hot.traverse(0, "previous")).toBe(3);
      expect(hot.traverse(null)).toBe(0);
      expect(hot.traverse(0, "first")).toBe(0);
      expect(hot.traverse(0, "last")).toBe(3);
      // Spatial still allowed to scan candidates by id; only sequential rank is constrained.
      expect(hot.traverse(0, "down")).toBe(1);
    } finally {
      indexOfSpy.mockRestore();
    }
  });
});

describe("candidate grouping hot path", () => {
  it("uses preordered series boundaries without sorting during resolution", () => {
    const plotScene = sceneWithPoints([
      [10, 30],
      [10, 10],
      [10, 20],
    ]);
    const store = buildCandidateStore(plotScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: 1,
        yValue: primitiveIndex,
        seriesId: primitiveIndex,
        seriesRank: 2 - primitiveIndex,
      }),
    });
    // Force the lazy construction/sort boundary before policing resolution.
    void store.x;
    const sortSpy = spyOn(Array.prototype, "toSorted").mockImplementation(function () {
      throw new Error("group resolution sorted");
    });
    try {
      expect([...store.group(0, "x")!.memberIds]).toEqual([2, 1, 0]);
    } finally {
      sortSpy.mockRestore();
    }
  });

  it("does not produce an axis target for an invalid logical bucket", () => {
    const plotScene = sceneWithPoints([[10, 10]]);
    const store = buildCandidateStore(plotScene, {
      datum: () => ({ xValue: Number.NaN, yValue: 1 }),
    });
    expect(store.group(0, "x")).toBeNull();
    expect(store.nearest(10, 10, { mode: "x", maxDistance: 100 })).toBeNull();
  });
});

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
});
