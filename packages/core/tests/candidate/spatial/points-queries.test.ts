import { describe, expect, it, spyOn } from "bun:test";

import { buildCandidateStore } from "../../../src/candidate-store.ts";
import type { Scene } from "../../../src/scene.ts";
import { scene, sceneWithPoints } from "../fixtures.ts";
import { largePointScene } from "./fixtures.ts";

describe("candidate spatial query hot path (issue #214) — points-queries", () => {
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
  it("hitTest honors per-point sizes without rescanning the full sizes array (issue #978)", () => {
    // Variable aes(size): max query pad must still cover the largest mark, but
    // hitTest must not O(P)-scan batch.sizes on every probe (build precomputes).
    const count = 5_000;
    const positions = new Float32Array(count * 2);
    const rawSizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Sparse grid so one probe has a single clear hit under reverse paint order.
      positions[i * 2] = (i % 100) * 2;
      positions[i * 2 + 1] = Math.floor(i / 100) * 2;
      rawSizes[i] = 2;
    }
    // Large bubble on the right of the default 200×120 panel.
    const largeIndex = count - 1;
    positions[largeIndex * 2] = 160;
    positions[largeIndex * 2 + 1] = 60;
    rawSizes[largeIndex] = 40;

    const plotScene = scene();
    plotScene.batches = [
      {
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions,
        rowIndex: Uint32Array.from({ length: count }, (_, index) => index),
        size: 2,
        sizes: rawSizes,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
    ];
    const store = buildCandidateStore(plotScene);
    void store.x;

    // Probe on the large bubble center and near its hit edge (size + default tol 3).
    expect(store.hitTest(160, 60)?.id).toBe(largeIndex);
    expect(store.hitTest(160 + 35, 60)?.id).toBe(largeIndex);
    expect(store.hitTest(160 + 50, 60)).toBeNull();

    const batch = plotScene.batches[0]!;
    if (batch.kind !== "points" || batch.sizes === undefined) {
      throw new Error("expected points batch with sizes");
    }
    // TypedArray brand breaks Proxy for-of; instrument with an indexable iterable
    // so a full maxRadius scan is visible as O(P) iterator steps.
    const originalSizes = batch.sizes;
    let sizeIterSteps = 0;
    batch.sizes = {
      length: originalSizes.length,
      [Symbol.iterator](): Iterator<number> {
        let i = 0;
        return {
          next(): IteratorResult<number> {
            if (i >= originalSizes.length) return { done: true, value: undefined };
            sizeIterSteps++;
            return { done: false, value: originalSizes[i++]! };
          },
        };
      },
    } as unknown as Float32Array;
    // pointHitDistance reads sizes[primitive] — keep indexed access working.
    for (let i = 0; i < originalSizes.length; i++) {
      Object.defineProperty(batch.sizes, i, {
        enumerable: true,
        get(): number {
          return originalSizes[i]!;
        },
      });
    }

    sizeIterSteps = 0;
    // Any interior hit is fine — we only police full-array iteration for maxRadius.
    expect(store.hitTest(10, 10)).not.toBeNull();
    // Pre-fix: for (const r of batch.sizes) walks every element each probe.
    expect(sizeIterSteps).toBe(0);
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
});
