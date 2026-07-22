import { describe, expect, it } from "bun:test";

import { buildCandidateStore } from "../../../src/candidate-store.ts";
import { scene } from "../fixtures.ts";

describe("candidate spatial query hot path (issue #214) — rects-segments", () => {
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
});
