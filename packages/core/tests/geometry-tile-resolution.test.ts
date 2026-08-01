/**
 * geom_tile default sizing derives resolution() once per continuous axis.
 * resolution() scans the whole column, so deriving it inside the row loop
 * made a continuous-axis heatmap quadratic in its cell count.
 */
import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { tileRectsBatch } from "../src/pipeline/geometry-edge-rects.ts";
import type { Frame } from "../src/pipeline/geometry-shared.ts";
import type { LayerFrame } from "../src/pipeline/types.ts";

type ScaleKind = "linear" | "band";

function scaleOf(kind: ScaleKind): Frame["xScale"] {
  if (kind === "band") {
    return {
      type: "band",
      step: 0.1,
      normalize: (v: unknown) => (v === null ? undefined : Number(v) / 100),
      normalizeTransformed: (v: number) => v,
    };
  }
  return {
    type: "linear",
    normalize: (v: number) => v,
    normalizeTransformed: (v: number) => v / 100,
  };
}

function fx(x: ScaleKind, y: ScaleKind): Frame {
  return fromPartial<Frame>({
    innerWidth: 100,
    innerHeight: 100,
    xScale: scaleOf(x),
    yScale: scaleOf(y),
  });
}

/** Counts element reads so a per-row rescan is distinguishable from one pass. */
function counting(values: Float64Array): { array: Float64Array; reads: () => number } {
  let reads = 0;
  const array = new Proxy(values, {
    get(target, prop) {
      if (typeof prop === "string" && /^\d+$/.test(prop)) reads += 1;
      return Reflect.get(target, prop) as unknown;
    },
  });
  return { array, reads: () => reads };
}

function tileFrame(input: {
  n: number;
  xNumeric: Float64Array | null;
  yNumeric: Float64Array | null;
  xValues?: unknown[] | null;
  yValues?: unknown[] | null;
  widthField?: string | null;
  heightField?: string | null;
  column?: Record<string, number[]>;
}): LayerFrame {
  return fromAny<LayerFrame>({
    n: input.n,
    xNumeric: input.xNumeric,
    yNumeric: input.yNumeric,
    xValues: input.xValues ?? null,
    yValues: input.yValues ?? null,
    fillValues: null,
    colorValues: null,
    rowIndex: Uint32Array.from({ length: input.n }, (_, i) => i),
    table: { column: (name: string) => input.column?.[name] ?? [] },
    binding: {
      index: 0,
      widthField: input.widthField ?? null,
      heightField: input.heightField ?? null,
      fill: { constant: "#000", scaledConstant: null },
      color: { constant: "#000", scaledConstant: null },
      layer: { params: {} },
    },
  });
}

/** Evenly spaced grid: N cells, gap 1, so resolution() is well defined. */
function grid(n: number): Float64Array {
  return Float64Array.from({ length: n }, (_, i) => i + 1);
}

describe("geom_tile continuous default size", () => {
  const N = 64;

  it("reads each continuous axis column a bounded number of times", () => {
    const x = counting(grid(N));
    const y = counting(grid(N));
    const frame = tileFrame({ n: N, xNumeric: x.array, yNumeric: y.array });
    const batch = tileRectsBatch(frame, fx("linear", "linear"), null, null, fromPartial({}), []);
    expect(batch?.rects.length).toBe(N * 4);
    // One resolution() scan (N) plus one center read per row (N) is ~2N per
    // axis. Deriving resolution() per row costs N*N = 4096 instead.
    expect(x.reads()).toBeGreaterThan(0);
    expect(x.reads()).toBeLessThan(6 * N);
    expect(y.reads()).toBeLessThan(6 * N);
  });

  it("still bounds the reads when width and height are mapped columns", () => {
    // sizeAt ignores the default here, but the argument was still evaluated
    // once per row before the hoist.
    const x = counting(grid(N));
    const y = counting(grid(N));
    const frame = tileFrame({
      n: N,
      xNumeric: x.array,
      yNumeric: y.array,
      widthField: "w",
      heightField: "h",
      column: {
        w: Array.from({ length: N }, () => 1),
        h: Array.from({ length: N }, () => 1),
      },
    });
    const batch = tileRectsBatch(frame, fx("linear", "linear"), null, null, fromPartial({}), []);
    // Assert the rows survived, so the bounds cannot be met by emitting nothing.
    expect(batch?.rects.length).toBe(N * 4);
    expect(x.reads()).toBeLessThan(6 * N);
    expect(y.reads()).toBeLessThan(6 * N);
  });

  it("never touches the numeric column on a band axis", () => {
    // Band axes size from scale.step and read xValues, so they must not gain a
    // resolution() scan they never paid for. This is the only test holding the
    // band guard, so it also pins that the mixed-axis geometry is still emitted.
    const x = counting(grid(N));
    const frame = tileFrame({
      n: N,
      xNumeric: x.array,
      yNumeric: grid(N),
      xValues: Array.from({ length: N }, (_, i) => i + 1),
    });
    const batch = tileRectsBatch(frame, fx("band", "linear"), null, null, fromPartial({}), []);
    expect(batch?.rects.length).toBe(N * 4);
    // Band x: one step (0.1) of the 100px panel. Continuous y: gap 1 of the
    // /100 normalize, so 1px. Mixed axes size from their own rule.
    expect(batch!.rects[2]!).toBeCloseTo(10, 6);
    expect(batch!.rects[3]!).toBeCloseTo(1, 6);
    expect(x.reads()).toBe(0);
  });

  it("sizes continuous tiles from the minimum positive gap", () => {
    // Gap 2 between distinct x values → each tile spans 2 user units, which is
    // 2/100 of the axis, so 2px of the 100px panel.
    const spaced = Float64Array.from([10, 12, 14, 16]);
    const frame = tileFrame({ n: 4, xNumeric: spaced, yNumeric: Float64Array.from([1, 1, 1, 1]) });
    const batch = tileRectsBatch(frame, fx("linear", "linear"), null, null, fromPartial({}), []);
    const widths: number[] = [];
    for (let i = 0; i < batch!.rects.length; i += 4) widths.push(batch!.rects[i + 2]!);
    expect(widths.every((w) => Math.abs(w - 2) < 1e-6)).toBe(true);
  });

  it("falls back to a unit gap when every x is identical", () => {
    const flat = Float64Array.from([5, 5, 5, 5]);
    const frame = tileFrame({ n: 4, xNumeric: flat, yNumeric: Float64Array.from([1, 2, 3, 4]) });
    const batch = tileRectsBatch(frame, fx("linear", "linear"), null, null, fromPartial({}), []);
    expect(batch!.rects[2]).toBeCloseTo(1, 6);
  });
});
