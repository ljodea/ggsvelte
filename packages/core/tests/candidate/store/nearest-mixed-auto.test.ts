/**
 * #770 — under inspect auto mode, path/smooth x-axis snap must not steal hits
 * from co-layered exact (point) candidates when the pointer is on a point.
 */
import { describe, expect, it } from "bun:test";

import { buildCandidateStore } from "../../../src/candidate-store.ts";
import { scene } from "../fixtures.ts";

/** Point at (50, 30) + horizontal stroked path at y=80 (x 0..100). */
function mixedPointPathScene() {
  const plot = scene();
  plot.batches = [
    {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: new Float32Array([50, 30]),
      rowIndex: new Uint32Array([0]),
      size: 5,
      alpha: 1,
      shape: "circle",
      fill: null,
    },
    {
      kind: "paths",
      layerIndex: 1,
      panelIndex: 0,
      positions: new Float32Array([0, 80, 50, 80, 100, 80]),
      rowIndex: new Uint32Array([1, 2, 3]),
      pathOffsets: new Uint32Array([0, 3]),
      strokes: [null],
      linewidth: 2,
      alpha: 1,
      curve: "linear",
    },
  ];
  return plot;
}

describe("CandidateStore.nearest auto — mixed point + path (#770)", () => {
  it("prefers an exact point hit over path x-snap when the pointer is on the point", () => {
    const store = buildCandidateStore(mixedPointPathScene(), {
      datum: ({ kind, primitiveIndex }) =>
        kind === "points"
          ? { xValue: 50, yValue: 30, autoMode: "exact" as const, seriesId: 0 }
          : {
              xValue: primitiveIndex * 50,
              yValue: 80,
              autoMode: "x" as const,
              seriesId: 1,
            },
    });
    // Probe slightly off the point center but still inside the ring (size 5 + tol 3).
    // Path vertex at x=50 has axis distance 2; point exact distance is ~2.8.
    // Pure distance ranking therefore prefers the path (the #770 bug).
    const hit = store.nearest(52, 32, { mode: "auto", maxDistance: 24 });
    expect(hit).not.toBeNull();
    expect(hit!.id).toBe(0);
    expect(hit!.mode).toBe("exact");
    expect(hit!.rowIndex).toBe(0);
  });

  it("still x-snaps a path-only chart under auto (no exact competitor)", () => {
    const plot = scene();
    plot.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([0, 50, 50, 50, 100, 50]),
        rowIndex: new Uint32Array([0, 1, 2]),
        pathOffsets: new Uint32Array([0, 3]),
        strokes: [null],
        linewidth: 2,
        alpha: 1,
        curve: "linear",
      },
    ];
    const store = buildCandidateStore(plot, {
      datum: ({ primitiveIndex }) => ({
        xValue: primitiveIndex * 50,
        yValue: 50,
        autoMode: "x" as const,
      }),
    });
    // Far in y from the stroke; still within maxDistance on dominant x.
    const hit = store.nearest(50, 90, { mode: "auto", maxDistance: 24 });
    expect(hit).toMatchObject({ mode: "x" });
    expect(hit!.id).toBe(1);
  });

  it("x-snaps the path when the pointer is on the stroke and away from points", () => {
    const store = buildCandidateStore(mixedPointPathScene(), {
      datum: ({ kind, primitiveIndex }) =>
        kind === "points"
          ? { xValue: 50, yValue: 30, autoMode: "exact" as const }
          : {
              xValue: primitiveIndex * 50,
              yValue: 80,
              autoMode: "x" as const,
            },
    });
    const hit = store.nearest(50, 80, { mode: "auto", maxDistance: 24 });
    expect(hit).not.toBeNull();
    // No exact-mode ring hit at (50, 80); path axis-snap wins with mode "x".
    expect(hit!.mode).toBe("x");
    expect(hit!.id).not.toBe(0);
  });

  it("does not apply exact-over-path preference under explicit mode x", () => {
    // Path sample sits at the probe's x; point sits 5px left so axis distance loses.
    const plot = scene();
    plot.batches = [
      {
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([45, 30]),
        rowIndex: new Uint32Array([0]),
        size: 8,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
      {
        kind: "paths",
        layerIndex: 1,
        panelIndex: 0,
        positions: new Float32Array([0, 80, 50, 80, 100, 80]),
        rowIndex: new Uint32Array([1, 2, 3]),
        pathOffsets: new Uint32Array([0, 3]),
        strokes: [null],
        linewidth: 2,
        alpha: 1,
        curve: "linear",
      },
    ];
    const store = buildCandidateStore(plot, {
      datum: ({ kind, primitiveIndex }) =>
        kind === "points"
          ? { xValue: 45, yValue: 30, autoMode: "exact" as const }
          : {
              xValue: primitiveIndex * 50,
              yValue: 80,
              autoMode: "x" as const,
            },
    });
    // Explicit "x" is opt-in full-panel snap — path at x=50 beats point at x=45.
    // (Under auto the same probe would prefer the point ring.)
    const hit = store.nearest(50, 30, { mode: "x", maxDistance: 24 });
    expect(hit).not.toBeNull();
    expect(hit!.mode).toBe("x");
    expect(hit!.id).not.toBe(0);
    const underAuto = store.nearest(50, 30, { mode: "auto", maxDistance: 24 });
    expect(underAuto).toMatchObject({ id: 0, mode: "exact" });
  });

  it("filled area still x-snaps under auto when hover is away from co-layered points", () => {
    const plot = scene();
    plot.batches = [
      {
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([10, 10]),
        rowIndex: new Uint32Array([0]),
        size: 4,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
      {
        kind: "paths",
        layerIndex: 1,
        panelIndex: 0,
        // Large filled triangle covering the probe region far from the point.
        positions: new Float32Array([20, 20, 120, 20, 70, 100]),
        rowIndex: new Uint32Array([1, 2, 3]),
        pathOffsets: new Uint32Array([0, 3]),
        strokes: [null],
        fills: [null],
        closed: true,
        linewidth: 0,
        alpha: 1,
        curve: "linear",
      },
    ];
    const store = buildCandidateStore(plot, {
      datum: ({ kind, primitiveIndex }) =>
        kind === "points"
          ? { xValue: 10, yValue: 10, autoMode: "exact" as const }
          : {
              xValue: 20 + primitiveIndex * 40,
              yValue: primitiveIndex === 2 ? 100 : 20,
              autoMode: "x" as const,
            },
    });
    // Inside the fill, far from the point — must not promote fill vertices via
    // unbounded containment hypot; axis-snap (tier 2) picks nearest-in-x.
    const hit = store.nearest(70, 40, { mode: "auto", maxDistance: 24 });
    expect(hit).not.toBeNull();
    expect(hit!.mode).toBe("x");
    expect(hit!.id).not.toBe(0);
  });
});
