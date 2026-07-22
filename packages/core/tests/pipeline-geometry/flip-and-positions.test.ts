/**
 * Geometry characterization — flip-and-positions.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";
import { flipBatchInPlace } from "../../src/pipeline/geometry.ts";
import type { PointsBatch, RectsBatch } from "../../src/scene.ts";

describe("flipBatchInPlace — coord flip vertex map", () => {
  it("maps points (x,y) -> (W-y, H-x)", () => {
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: new Float32Array([10, 20, 30, 40]),
      rowIndex: new Uint32Array([0, 1]),
      size: 2,
      alpha: 1,
      shape: "circle",
      fill: null,
    };
    flipBatchInPlace(batch, 100, 200);
    expect([...batch.positions]).toEqual([100 - 20, 200 - 10, 100 - 40, 200 - 30]);
  });

  it("swaps rect origin/size through the same orientation transform", () => {
    const batch: RectsBatch = {
      kind: "rects",
      layerIndex: 0,
      panelIndex: 0,
      // x=10, y=20, w=30, h=40
      rects: new Float32Array([10, 20, 30, 40]),
      rowIndex: new Uint32Array([0]),
      fill: null,
      alpha: 1,
    };
    flipBatchInPlace(batch, 100, 200);
    // x' = W - (y+h) = 100 - 60 = 40; y' = H - (x+w) = 200 - 40 = 160; w'=h=40; h'=w=30
    expect([...batch.rects]).toEqual([40, 160, 40, 30]);
  });
});

describe("collectPointPositions", () => {
  it("drops NaN positions and keeps finite points", async () => {
    const { collectPointPositions } = await import("../../src/pipeline/geometry-points-collect.ts");
    const frame = fromAny({
      n: 3,
      xNumeric: new Float64Array([0, NaN, 1]),
      yNumeric: new Float64Array([0.5, 0.5, 0.25]),
      xValues: null,
      offsetX: null,
      offsetY: null,
      rowIndex: new Uint32Array([0, 1, 2]),
    });
    const fx = fromAny({
      innerWidth: 100,
      innerHeight: 200,
      xScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
      yScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
    });
    const collected = collectPointPositions(frame, fx);
    expect(collected.kept).toBe(2);
    expect([...collected.keptRows.subarray(0, 2)]).toEqual([0, 2]);
  });
});

describe("flipDisplayTitles / flipDisplayFreeFlags", () => {
  it("swaps titles and free flags under coord flip", async () => {
    const { flipDisplayTitles, flipDisplayFreeFlags } =
      await import("../../src/pipeline/panel-layout-chrome-display-flip.ts");
    expect(flipDisplayTitles(true, "X", "Y")).toEqual({ hTitle: "Y", vTitle: "X" });
    expect(flipDisplayTitles(false, "X", "Y")).toEqual({ hTitle: "X", vTitle: "Y" });
    expect(flipDisplayFreeFlags(true, true, false)).toEqual({ freeH: false, freeV: true });
  });
});
