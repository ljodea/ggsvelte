import { describe, expect, it } from "bun:test";

import { buildCandidateStore } from "../../../src/candidate-store.ts";
import type { PathsBatch, Scene } from "../../../src/scene.ts";
import { scene } from "../fixtures.ts";

/** Filled triangle A: (20,20) (80,20) (50,80). Interior spans x∈[40,60] at y=60. */
function filledTriangleScene(): Scene {
  const plot = scene();
  plot.batches = [
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
  return plot;
}

function store(plot: Scene) {
  return buildCandidateStore(plot, {
    datum: () => ({ xValue: 1, yValue: 2, autoMode: "exact" }),
  });
}

describe("queryRect over filled paths (fill containment refine)", () => {
  it("interior brush with no anchor or edge in the rect hits every subpath candidate", () => {
    const candidates = store(filledTriangleScene());
    // Rect (40,40)-(60,50): center (50,45) is inside the triangle; the three
    // anchors and all edges stay outside the rect, so only the fill test hits.
    const hits = Array.from(candidates.queryRect(40, 40, 60, 50)).toSorted((a, b) => a - b);
    expect(hits).toEqual([0, 1, 2]);
  });

  it("brush overlapping the subpath AABB with center outside the fill hits nothing", () => {
    const candidates = store(filledTriangleScene());
    // Rect (70,70)-(78,78) sits inside the triangle's AABB corner but its
    // center (74,74) is outside the fill; no anchor or edge in the rect.
    // Pins the existing contract: fill∩rect is tested at the rect center.
    expect(candidates.queryRect(70, 70, 78, 78)).toEqual(new Uint32Array(0));
  });

  it("interior brush refine reads subpath vertices once per query, not once per candidate", () => {
    // Regular 200-gon centered (100,60), radius 50: every render vertex is a
    // candidate (K = V = 200). An interior brush shortlists all of them via the
    // shared subpath AABB, and each one reaches the fill-containment test.
    const V = 200;
    const positions = new Float32Array(V * 2);
    for (let i = 0; i < V; i++) {
      const angle = (2 * Math.PI * i) / V;
      positions[i * 2] = 100 + 50 * Math.cos(angle);
      positions[i * 2 + 1] = 60 + 50 * Math.sin(angle);
    }
    const plot = scene();
    const batch: PathsBatch = {
      kind: "paths",
      layerIndex: 0,
      panelIndex: 0,
      positions,
      rowIndex: Uint32Array.from({ length: V }, (_, i) => i),
      pathOffsets: new Uint32Array([0, V]),
      strokes: [null],
      fills: [null],
      closed: true,
      linewidth: 0,
      alpha: 1,
      curve: "linear",
    };
    plot.batches = [batch];
    const candidates = store(plot);
    // First query forces the lazy store build (construction reads are free).
    expect(candidates.queryRect(95, 55, 105, 65)).toHaveLength(V);

    let reads = 0;
    batch.positions = new Proxy(positions, {
      get(target, prop) {
        if (typeof prop === "string" && /^\d+$/.test(prop)) reads += 1;
        return Reflect.get(target, prop) as unknown;
      },
    });
    // Brush (95,55)-(105,65): center (100,60) inside; anchors and edges sit on
    // the radius-50 ring, far from the rect, so every candidate takes the fill
    // branch. Reads are deterministic: one insidePath walk (4 reads x V edges)
    // plus ~8 reads per candidate edge check ≈ 12V. The 15V bound fails if
    // even one extra full walk sneaks back in (16V), let alone the K×V ≈ 160k
    // of per-candidate recompute.
    expect(candidates.queryRect(95, 55, 105, 65)).toHaveLength(V);
    expect(reads).toBeGreaterThan(0);
    expect(reads).toBeLessThan(15 * V);
  });

  it("two filled subpaths resolve containment independently", () => {
    const plot = scene();
    plot.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        // Subpath A: triangle (20,20) (80,20) (50,80).
        // Subpath B: triangle (20,90) (180,90) (180,30) — its AABB covers the
        // brush below, but the brush center is outside its fill.
        positions: new Float32Array([20, 20, 80, 20, 50, 80, 20, 90, 180, 90, 180, 30]),
        rowIndex: new Uint32Array([0, 1, 2, 3, 4, 5]),
        pathOffsets: new Uint32Array([0, 3, 6]),
        strokes: [null, null],
        fills: [null, null],
        closed: true,
        linewidth: 0,
        alpha: 1,
        curve: "linear",
      },
    ];
    const candidates = store(plot);
    // Brush (40,40)-(60,50): center (50,45) inside A, outside B; B is
    // shortlisted via its AABB but must not hit.
    const hits = Array.from(candidates.queryRect(40, 40, 60, 50)).toSorted((a, b) => a - b);
    expect(hits).toEqual([0, 1, 2]);
  });
});
