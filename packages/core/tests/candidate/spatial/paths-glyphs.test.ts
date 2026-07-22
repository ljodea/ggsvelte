import { describe, expect, it } from "bun:test";

import { buildCandidateStore } from "../../../src/candidate-store.ts";
import { scene } from "../fixtures.ts";

describe("candidate spatial query hot path (issue #214) — paths-glyphs", () => {
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
