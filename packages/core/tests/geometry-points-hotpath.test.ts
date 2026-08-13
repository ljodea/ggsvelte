/**
 * Continuous scatter hot path: one normalize+pixel pass that also keeps
 * source rows. Behavioral seam for competitive scatter-color-Nk work.
 */
import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { packContinuousPointsOnePass } from "../src/pipeline/geometry-points-collect.ts";
import type { Frame } from "../src/pipeline/geometry-shared.ts";
import type { LayerFrame } from "../src/pipeline/types.ts";
import { trainContinuous } from "../src/scales/train.ts";

function continuousFrame(n: number, opts?: { nanAt?: number; offsetX?: boolean }): LayerFrame {
  const xNumeric = new Float64Array(n);
  const yNumeric = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xNumeric[i] = i;
    yNumeric[i] = i * 2;
  }
  if (opts?.nanAt !== undefined) yNumeric[opts.nanAt] = Number.NaN;
  return fromAny<LayerFrame>({
    n,
    xNumeric,
    yNumeric,
    xValues: null,
    yValues: null,
    offsetX: opts?.offsetX === true ? new Float64Array(n) : null,
    offsetY: null,
    rowIndex: Uint32Array.from({ length: n }, (_, i) => i + 10),
  });
}

function continuousFx(): Frame {
  const xScale = trainContinuous([[0, 10]], {}).scale;
  const yScale = trainContinuous([[0, 20]], {}).scale;
  return fromPartial<Frame>({
    innerWidth: 100,
    innerHeight: 50,
    xScale,
    yScale,
  });
}

describe("packContinuousPointsOnePass", () => {
  it("writes pixel coords and source rows in one pass for finite continuous points", () => {
    const packed = packContinuousPointsOnePass(continuousFrame(3), continuousFx());
    expect(packed).not.toBeNull();
    expect(packed!.kept).toBe(3);
    expect([...packed!.rowIndex.subarray(0, 3)]).toEqual([10, 11, 12]);
    expect([...packed!.keptRows.subarray(0, 3)]).toEqual([0, 1, 2]);
    // x=0,1,2 on domain [0,10] → 0, 0.1, 0.2 of width 100
    // y=0,2,4 on domain [0,20] → 0, 0.1, 0.2 of height 50, flipped
    expect(packed!.positions[0]).toBeCloseTo(0);
    expect(packed!.positions[1]).toBeCloseTo(50);
    expect(packed!.positions[2]).toBeCloseTo(10);
    expect(packed!.positions[3]).toBeCloseTo(45);
    expect(packed!.positions[4]).toBeCloseTo(20);
    expect(packed!.positions[5]).toBeCloseTo(40);
  });

  it("drops NaN positions and keeps remaining rows", () => {
    const packed = packContinuousPointsOnePass(continuousFrame(3, { nanAt: 1 }), continuousFx());
    expect(packed).not.toBeNull();
    expect(packed!.kept).toBe(2);
    expect([...packed!.keptRows.subarray(0, 2)]).toEqual([0, 2]);
    expect([...packed!.rowIndex.subarray(0, 2)]).toEqual([10, 12]);
  });

  it("returns null when a positional offset is present (caller uses two-pass)", () => {
    expect(
      packContinuousPointsOnePass(continuousFrame(2, { offsetX: true }), continuousFx()),
    ).toBeNull();
  });

  it("returns null for band scales", () => {
    const fx = fromPartial<Frame>({
      innerWidth: 100,
      innerHeight: 50,
      xScale: { type: "band" },
      yScale: trainContinuous([[0, 20]], {}).scale,
    });
    expect(packContinuousPointsOnePass(continuousFrame(2), fx)).toBeNull();
  });
});
