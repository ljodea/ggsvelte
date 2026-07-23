/**
 * Errorbar emit prealloc: 3 segments per kept row into typed buffers;
 * dense reuses capacity-n arrays, sparse slices.
 */
import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { emitErrorbarRows } from "../src/pipeline/geometry-errorbar-rows.ts";
import type { Frame } from "../src/pipeline/geometry-shared.ts";
import type { LayerFrame } from "../src/pipeline/types.ts";

function fx(w = 100, h = 100): Frame {
  return fromPartial<Frame>({
    innerWidth: w,
    innerHeight: h,
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
}

function frameOf(input: {
  n: number;
  x: Float64Array;
  ymin: Float64Array;
  ymax: Float64Array;
  rowIndex?: Uint32Array;
  colorValues?: string[] | null;
}): LayerFrame {
  return fromAny<LayerFrame>({
    n: input.n,
    xNumeric: input.x,
    xValues: null,
    yNumeric: null,
    yValues: null,
    ymin: input.ymin,
    ymax: input.ymax,
    rowIndex: input.rowIndex ?? Uint32Array.from({ length: input.n }, (_, i) => i + 1),
    colorValues: input.colorValues ?? null,
    binding: {
      index: 0,
      color: { constant: "#000", scaledConstant: null },
    },
  });
}

const fullSpan = (_row: number, center: number): readonly [number, number] => [
  center - 0.1,
  center + 0.1,
];

describe("emitErrorbarRows prealloc", () => {
  it("dense path emits 3 segments per row and reuses full capacity", () => {
    const frame = frameOf({
      n: 2,
      x: Float64Array.of(0.25, 0.75),
      ymin: Float64Array.of(0.2, 0.3),
      ymax: Float64Array.of(0.8, 0.9),
    });
    const emitted = emitErrorbarRows({
      frame,
      fx: fx(),
      color: null,
      wantsColors: false,
      xSpanOf: fullSpan,
    });
    expect(emitted.removed).toBe(0);
    expect(emitted.keptSegments).toBe(6);
    expect(emitted.segments).toBeInstanceOf(Float32Array);
    expect(emitted.rowIndex).toBeInstanceOf(Uint32Array);
    expect(emitted.segments.length).toBe(24); // 2 rows × 12 floats
    expect(emitted.rowIndex.length).toBe(6);
    expect([...emitted.rowIndex]).toEqual([1, 1, 1, 2, 2, 2]);
    // Stem of first bar: x=25, y from 80→20 (height - t*height)
    expect(emitted.segments[0]).toBeCloseTo(25);
    expect(emitted.segments[1]).toBeCloseTo(100 - 0.2 * 100);
    expect(emitted.segments[2]).toBeCloseTo(25);
    expect(emitted.segments[3]).toBeCloseTo(100 - 0.8 * 100);
    expect(emitted.strokes).toBeNull();
  });

  it("sparse path compacts after dropped rows", () => {
    const frame = frameOf({
      n: 3,
      x: Float64Array.of(0.2, Number.NaN, 0.8),
      ymin: Float64Array.of(0.1, 0.1, 0.1),
      ymax: Float64Array.of(0.9, 0.9, 0.9),
      rowIndex: Uint32Array.of(10, 11, 12),
    });
    const emitted = emitErrorbarRows({
      frame,
      fx: fx(),
      color: null,
      wantsColors: false,
      xSpanOf: fullSpan,
    });
    expect(emitted.removed).toBe(1);
    expect(emitted.keptSegments).toBe(6); // 2 rows × 3
    expect(emitted.segments.length).toBe(24);
    expect(emitted.rowIndex.length).toBe(6);
    expect([...emitted.rowIndex]).toEqual([10, 10, 10, 12, 12, 12]);
    // Not the full n*12 scratch buffer (3×12=36)
    expect(emitted.segments.byteLength).toBe(24 * 4);
  });

  it("returns empty typed arrays when every row is removed", () => {
    const frame = frameOf({
      n: 2,
      x: Float64Array.of(Number.NaN, Number.NaN),
      ymin: Float64Array.of(0, 0),
      ymax: Float64Array.of(1, 1),
    });
    const emitted = emitErrorbarRows({
      frame,
      fx: fx(),
      color: null,
      wantsColors: false,
      xSpanOf: fullSpan,
    });
    expect(emitted.keptSegments).toBe(0);
    expect(emitted.removed).toBe(2);
    expect(emitted.segments.length).toBe(0);
    expect(emitted.rowIndex.length).toBe(0);
  });

  it("writes three stroke entries per kept row when colors are mapped", () => {
    const frame = frameOf({
      n: 1,
      x: Float64Array.of(0.5),
      ymin: Float64Array.of(0.2),
      ymax: Float64Array.of(0.8),
      colorValues: ["red"],
    });
    const color = fromAny({
      scale: {
        colorOf: (v: unknown) => `c:${String(v)}`,
        naValue: null,
        unknownValue: "#999",
      },
    });
    const emitted = emitErrorbarRows({
      frame,
      fx: fx(),
      color,
      wantsColors: true,
      xSpanOf: fullSpan,
    });
    expect(emitted.strokes).toEqual(["c:red", "c:red", "c:red"]);
  });
});
