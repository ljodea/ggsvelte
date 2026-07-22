/**
 * Glyph emit/pack prealloc: typed buffers with dense-as-is / sparse-slice,
 * matching rects/points. Characterization of positions, rowIndex, texts,
 * colors, and empty → null.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { emitGlyphRows } from "../src/pipeline/geometry-glyphs-rows.ts";
import { packGlyphsBatch } from "../src/pipeline/geometry-glyphs-pack.ts";
import type { Frame } from "../src/pipeline/geometry-shared.ts";
import type { LayerFrame } from "../src/pipeline/types.ts";

function linearScale(): Frame["xScale"] {
  return fromAny({
    type: "linear",
    normalize: (v: number) => v,
    normalizeTransformed: (v: number) => v,
  });
}

function fx100(): Frame {
  return {
    innerWidth: 100,
    innerHeight: 100,
    xScale: linearScale(),
    yScale: linearScale(),
  };
}

function textFrame(input: {
  n: number;
  x: Float64Array;
  y: Float64Array;
  labels: (string | null)[];
  rowIndex?: Uint32Array;
  colorValues?: (string | null)[] | null;
}): LayerFrame {
  const { n, x, y, labels } = input;
  return fromAny<LayerFrame>({
    n,
    xNumeric: x,
    yNumeric: y,
    xValues: null,
    yValues: null,
    labelValues: labels,
    rowIndex: input.rowIndex ?? Uint32Array.from({ length: n }, (_, i) => i),
    colorValues: input.colorValues ?? null,
    offsetX: null,
    offsetY: null,
    binding: {
      index: 0,
      labelConstant: null,
      color: { constant: "#111", scaledConstant: null },
    },
  });
}

describe("emitGlyphRows prealloc", () => {
  it("dense path fills typed buffers for every row", () => {
    const frame = textFrame({
      n: 2,
      x: Float64Array.of(0.25, 0.75),
      y: Float64Array.of(0.1, 0.9),
      labels: ["a", "b"],
    });
    const emitted = emitGlyphRows({
      frame,
      fx: fx100(),
      color: null,
      wantsColors: false,
      dx: 4,
      dy: -2,
    });
    expect(emitted.kept).toBe(2);
    expect(emitted.removed).toBe(0);
    expect(emitted.positions).toBeInstanceOf(Float32Array);
    expect(emitted.rowIndex).toBeInstanceOf(Uint32Array);
    // Capacity n; dense pack will reuse without copy.
    expect(emitted.positions.length).toBe(4);
    expect(emitted.rowIndex.length).toBe(2);
    expect(emitted.texts[0]).toBe("a");
    expect(emitted.texts[1]).toBe("b");
    expect(emitted.colors).toBeNull();
    // x = t * width + dx; y = height - t * height + dy
    expect(emitted.positions[0]).toBeCloseTo(0.25 * 100 + 4);
    expect(emitted.positions[1]).toBeCloseTo(100 - 0.1 * 100 - 2);
    expect(emitted.positions[2]).toBeCloseTo(0.75 * 100 + 4);
    expect(emitted.positions[3]).toBeCloseTo(100 - 0.9 * 100 - 2);
  });

  it("skips null labels and non-finite positions (sparse kept)", () => {
    const frame = textFrame({
      n: 3,
      x: Float64Array.of(0.2, Number.NaN, 0.8),
      y: Float64Array.of(0.5, 0.5, 0.5),
      labels: ["keep", "drop-nan", null],
      rowIndex: Uint32Array.of(10, 11, 12),
    });
    // Fix third label to a keep so only middle drops for NaN; add fourth? n=3 with last null.
    // Rows: 0 keep, 1 NaN x drop, 2 null label drop → kept 1
    const emitted = emitGlyphRows({
      frame,
      fx: fx100(),
      color: null,
      wantsColors: false,
      dx: 0,
      dy: 0,
    });
    expect(emitted.kept).toBe(1);
    expect(emitted.removed).toBe(2);
    expect(emitted.rowIndex[0]).toBe(10);
    expect(emitted.texts[0]).toBe("keep");
  });

  it("writes mapped colors only when wantsColors", () => {
    const frame = textFrame({
      n: 2,
      x: Float64Array.of(0, 1),
      y: Float64Array.of(0, 1),
      labels: ["a", "b"],
      colorValues: ["red", "blue"],
    });
    const resolved = {
      scale: {
        colorOf: (v: unknown) => `c:${String(v)}`,
        naValue: null,
        unknownValue: "#999",
      },
    };
    const emitted = emitGlyphRows({
      frame,
      fx: fx100(),
      color: fromAny(resolved),
      wantsColors: true,
      dx: 0,
      dy: 0,
    });
    expect(emitted.colors).not.toBeNull();
    expect(emitted.colors![0]).toBe("c:red");
    expect(emitted.colors![1]).toBe("c:blue");
  });
});

describe("packGlyphsBatch dense/sparse", () => {
  it("dense path reuses preallocated typed arrays without shrinking", () => {
    const frame = textFrame({
      n: 2,
      x: Float64Array.of(0, 1),
      y: Float64Array.of(0, 1),
      labels: ["a", "b"],
    });
    const emitted = emitGlyphRows({
      frame,
      fx: fx100(),
      color: null,
      wantsColors: false,
      dx: 0,
      dy: 0,
    });
    const batch = packGlyphsBatch({
      frame,
      emitted,
      wantsColors: false,
      params: { size: 14, anchor: "start" },
    });
    expect(batch).not.toBeNull();
    expect(batch!.positions).toBe(emitted.positions);
    expect(batch!.rowIndex).toBe(emitted.rowIndex);
    expect(batch!.texts).toBe(emitted.texts);
    expect(batch!.texts).toEqual(["a", "b"]);
    expect(batch!.size).toBe(14);
    expect(batch!.anchor).toBe("start");
  });

  it("sparse path compacts buffers to kept length", () => {
    const frame = textFrame({
      n: 3,
      x: Float64Array.of(0.1, Number.NaN, 0.9),
      y: Float64Array.of(0.2, 0.3, 0.4),
      labels: ["left", "mid", "right"],
      rowIndex: Uint32Array.of(1, 2, 3),
    });
    const emitted = emitGlyphRows({
      frame,
      fx: fx100(),
      color: null,
      wantsColors: false,
      dx: 0,
      dy: 0,
    });
    expect(emitted.kept).toBe(2);
    const batch = packGlyphsBatch({
      frame,
      emitted,
      wantsColors: false,
      params: {},
    });
    expect(batch).not.toBeNull();
    expect(batch!.positions.length).toBe(4);
    expect(batch!.rowIndex.length).toBe(2);
    expect(batch!.texts).toEqual(["left", "right"]);
    expect([...batch!.rowIndex]).toEqual([1, 3]);
    // Compact copy, not the full-n scratch buffer.
    expect(batch!.positions).not.toBe(emitted.positions);
    expect(batch!.positions.byteLength).toBe(4 * 4);
  });

  it("returns null when every row is removed", () => {
    const frame = textFrame({
      n: 2,
      x: Float64Array.of(Number.NaN, Number.NaN),
      y: Float64Array.of(0, 0),
      labels: ["a", "b"],
    });
    const emitted = emitGlyphRows({
      frame,
      fx: fx100(),
      color: null,
      wantsColors: false,
      dx: 0,
      dy: 0,
    });
    expect(emitted.kept).toBe(0);
    expect(packGlyphsBatch({ frame, emitted, wantsColors: false, params: {} })).toBeNull();
  });
});
