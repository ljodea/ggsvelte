/**
 * Glyph emit preallocation (#555) — typed buffers, no Float32Array.from on hot path.
 */
import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { emitGlyphRows } from "../../src/pipeline/geometry-glyphs-rows.ts";
import { packGlyphsBatch } from "../../src/pipeline/geometry-glyphs-pack.ts";
import type { LayerFrame } from "../../src/pipeline/types.ts";
import type { Frame } from "../../src/pipeline/geometry-shared.ts";

function makeFrame(n: number, opts: { dropMiddle?: boolean } = {}): LayerFrame {
  const xNumeric = new Float64Array(n);
  const yNumeric = new Float64Array(n);
  const rowIndex = new Uint32Array(n);
  const labelValues: (string | null)[] = [];
  for (let i = 0; i < n; i++) {
    xNumeric[i] = i;
    yNumeric[i] = i * 2;
    rowIndex[i] = i;
    // Drop middle row when requested (missing label → sparse path).
    labelValues[i] = opts.dropMiddle === true && i === 1 ? null : `L${i}`;
  }
  return fromPartial<LayerFrame>({
    n,
    rowIndex,
    xNumeric,
    yNumeric,
    xValues: null,
    yValues: null,
    labelValues,
    colorValues: null,
    offsetX: null,
    offsetY: null,
    binding: {
      index: 0,
      labelConstant: null,
      color: { constant: "#111", scaledConstant: null },
    },
  });
}

function makeFx(): Frame {
  return fromPartial<Frame>({
    xScale: {
      type: "linear",
      normalize: (v: number) => v / 10,
      normalizeTransformed: (v: number) => v / 10,
    },
    yScale: {
      type: "linear",
      normalize: (v: number) => v / 20,
      normalizeTransformed: (v: number) => v / 20,
    },
    innerWidth: 100,
    innerHeight: 50,
  });
}

describe("emitGlyphRows prealloc (#555)", () => {
  it("dense path keeps exact-sized typed positions without copy growth", () => {
    const frame = makeFrame(4);
    const emitted = emitGlyphRows({
      frame,
      fx: makeFx(),
      color: null,
      wantsColors: false,
      dx: 0,
      dy: 0,
    });
    expect(emitted.kept).toBe(4);
    expect(emitted.removed).toBe(0);
    expect(emitted.positions).toBeInstanceOf(Float32Array);
    expect(emitted.positions.length).toBe(8);
    expect(emitted.rowIndex).toBeInstanceOf(Uint32Array);
    expect([...emitted.rowIndex]).toEqual([0, 1, 2, 3]);
    expect(emitted.texts).toEqual(["L0", "L1", "L2", "L3"]);
    // First mark: tx=0 → x=0; ty=0 → y=50 (flipped).
    expect(emitted.positions[0]).toBeCloseTo(0);
    expect(emitted.positions[1]).toBeCloseTo(50);
  });

  it("sparse path compacts buffers after dropped labels", () => {
    const frame = makeFrame(3, { dropMiddle: true });
    const emitted = emitGlyphRows({
      frame,
      fx: makeFx(),
      color: null,
      wantsColors: false,
      dx: 1,
      dy: -2,
    });
    expect(emitted.kept).toBe(2);
    expect(emitted.removed).toBe(1);
    expect(emitted.positions.length).toBe(4);
    expect([...emitted.rowIndex]).toEqual([0, 2]);
    expect(emitted.texts).toEqual(["L0", "L2"]);
    const batch = packGlyphsBatch({
      frame,
      emitted,
      wantsColors: false,
      params: {},
    });
    expect(batch?.kind).toBe("glyphs");
    if (batch?.kind === "glyphs") {
      expect(batch.positions).toBe(emitted.positions);
      expect(batch.texts).toEqual(["L0", "L2"]);
    }
  });

  it("returns null when every row is dropped", () => {
    const frame = makeFrame(2);
    // Force all labels missing via constant path.
    frame.binding = {
      ...frame.binding,
      labelConstant: null,
    };
    frame.labelValues = [null, null];
    const emitted = emitGlyphRows({
      frame,
      fx: makeFx(),
      color: null,
      wantsColors: false,
      dx: 0,
      dy: 0,
    });
    expect(emitted.kept).toBe(0);
    expect(packGlyphsBatch({ frame, emitted, wantsColors: false, params: {} })).toBeNull();
  });
});
