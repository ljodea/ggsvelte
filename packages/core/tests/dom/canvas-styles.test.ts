import { describe, expect, it } from "bun:test";
import { fromPartial } from "@total-typescript/shoehorn";

import { drawBatch } from "../../src/dom/canvas-marks.ts";
import type { PathsBatch, PointsBatch } from "../../src/scene.ts";
import type { ThemeTokens } from "../../src/theme.ts";

function styleContext() {
  const calls: { name: string; alpha: number; width: number; dash: number[]; args: number[] }[] =
    [];
  let dash: number[] = [];
  const state = {
    globalAlpha: 0.8,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 7,
    lineJoin: "miter",
    lineCap: "butt",
  };
  const methods = new Set([
    "arc",
    "beginPath",
    "clearRect",
    "closePath",
    "fill",
    "lineTo",
    "moveTo",
    "rect",
    "setTransform",
    "stroke",
  ]);
  const ctx = new Proxy(state, {
    get(target, property): unknown {
      if (property === "setLineDash") {
        return (value: number[]) => {
          dash = [...value];
          calls.push({
            name: "setLineDash",
            alpha: target.globalAlpha,
            width: target.lineWidth,
            dash: [...dash],
            args: [...value],
          });
        };
      }
      if (property === "getLineDash") return () => [...dash];
      if (typeof property === "string" && methods.has(property)) {
        return (...args: number[]) => {
          calls.push({
            name: property,
            alpha: target.globalAlpha,
            width: target.lineWidth,
            dash: [...dash],
            args,
          });
        };
      }
      return Reflect.get(target, property);
    },
    set(target, property, value) {
      return Reflect.set(target, property, value);
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, state, dash: () => dash };
}

function styleContextsWithScratch(transform?: {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}) {
  const resolvedTransform = transform ?? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const scratch = styleContext();
  const target = styleContext();
  const targetRecord = target.ctx as unknown as Record<string, unknown>;
  targetRecord["canvas"] = {
    width: 800,
    height: 500,
    ownerDocument: {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => scratch.ctx,
      }),
    },
  };
  targetRecord["getTransform"] = () => resolvedTransform;
  targetRecord["save"] = () => {};
  targetRecord["restore"] = () => {};
  targetRecord["drawImage"] = () => {
    target.calls.push({
      name: "drawImage",
      alpha: target.state.globalAlpha,
      width: target.state.lineWidth,
      dash: target.dash(),
      args: [],
    });
  };
  return { scratch, target };
}

const theme = fromPartial<ThemeTokens>({ ink: "black", accent: "blue" });
const resolve = (color: string) => color;

describe("canvas mapped style vectors", () => {
  it("draws per-point radii, alpha, and shapes then restores context state", () => {
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([10, 10, 20, 20]),
      rowIndex: Uint32Array.from([0, 1]),
      size: 2,
      sizes: Float32Array.from([2, 8]),
      alpha: 0.5,
      alphas: Float32Array.from([0.25, 0.75]),
      shape: "circle",
      shapeIndexes: Uint8Array.from([0, 3]),
      fill: "red",
    };
    const { ctx, calls, state, dash } = styleContext();
    drawBatch(ctx, batch, theme, resolve);

    expect(calls.filter(({ name }) => name === "arc").map(({ args }) => args[2])).toEqual([2]);
    expect(calls.find(({ name }) => name === "fill")?.alpha).toBeCloseTo(0.1);
    expect(calls.filter(({ name }) => name === "fill").at(-1)?.alpha).toBeCloseTo(0.3);
    expect(state.globalAlpha).toBe(0.8);
    expect(state.lineWidth).toBe(7);
    expect(dash()).toEqual([]);
  });

  it("buckets interleaved categorical colors into one fill per color", () => {
    // Competitive scatter-color data is series-i%5 interleaved — contiguous
    // runs would be length 1 and cost one fill per point.
    const n = 10;
    const positions = new Float32Array(n * 2);
    const colors: string[] = [];
    for (let i = 0; i < n; i++) {
      positions[i * 2] = i;
      positions[i * 2 + 1] = i;
      colors.push(`c${i % 5}`);
    }
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions,
      rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
      size: 1.5,
      alpha: 0.7,
      shape: "circle",
      fill: null,
      colors,
    };
    const { ctx, calls } = styleContext();
    drawBatch(ctx, batch, theme, resolve);
    expect(calls.filter(({ name }) => name === "fill")).toHaveLength(5);
    expect(calls.filter(({ name }) => name === "arc")).toHaveLength(n);
  });

  it("buckets palette-index colors into one fill per palette entry", () => {
    const n = 10;
    const positions = new Float32Array(n * 2);
    const indexes = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      positions[i * 2] = i;
      positions[i * 2 + 1] = i;
      indexes[i] = i % 5;
    }
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions,
      rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
      size: 1.5,
      alpha: 0.7,
      shape: "circle",
      fill: null,
      colorPalette: ["c0", "c1", "c2", "c3", "c4"],
      colorIndexes: indexes,
    };
    const { ctx, calls } = styleContext();
    drawBatch(ctx, batch, theme, resolve);
    expect(calls.filter(({ name }) => name === "fill")).toHaveLength(5);
    expect(calls.filter(({ name }) => name === "arc")).toHaveLength(n);
  });

  it("composites oversized indexed-circle batches by palette without changing alpha order", () => {
    const colors = ["#000001", "#000002", "#000003", "#000004", "#000005"];
    const perColor = 2_049;
    const n = colors.length * perColor;
    const positions = new Float32Array(n * 2);
    const indexes = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      positions[i * 2] = i % 800;
      positions[i * 2 + 1] = i % 500;
      indexes[i] = i % colors.length;
    }
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions,
      rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
      size: 1.5,
      alpha: 0.7,
      shape: "circle",
      fill: null,
      colorPalette: colors,
      colorIndexes: indexes,
    };
    const { scratch, target } = styleContextsWithScratch({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 12,
      f: 34,
    });
    const resolved: string[] = [];
    drawBatch(target.ctx, batch, theme, (color) => {
      resolved.push(color);
      return color;
    });

    const composites = target.calls.filter(({ name }) => name === "drawImage");
    expect(composites).toHaveLength(colors.length);
    expect(composites.map(({ alpha }) => alpha)).toEqual(colors.map(() => 0.8 * 0.7));
    expect(target.calls.filter(({ name }) => name === "fill")).toHaveLength(0);
    expect(scratch.calls.filter(({ name }) => name === "clearRect")).toHaveLength(colors.length);
    expect(scratch.calls.filter(({ name }) => name === "arc")).toHaveLength(n);
    expect(scratch.calls.filter(({ name }) => name === "fill")).toHaveLength(n);
    expect(resolved.slice(1)).toEqual(colors);
    expect(target.state.globalAlpha).toBe(0.8);
  });

  it("uses one compositing strategy when only one indexed palette bucket is oversized", () => {
    const n = 2_050;
    const indexes = new Uint8Array(n);
    indexes[n - 1] = 1;
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: new Float32Array(n * 2),
      rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
      size: 1.5,
      alpha: 0.7,
      shape: "circle",
      fill: null,
      colorPalette: ["#000001", "#000002"],
      colorIndexes: indexes,
    };
    const { scratch, target } = styleContextsWithScratch();

    drawBatch(target.ctx, batch, theme, resolve);

    expect(target.calls.filter(({ name }) => name === "drawImage")).toHaveLength(2);
    expect(scratch.calls.filter(({ name }) => name === "fill")).toHaveLength(n);
  });

  it("falls back without crashing when the target canvas has no ownerDocument", () => {
    const n = 2_049;
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: new Float32Array(n * 2),
      rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
      size: 1.5,
      alpha: 1,
      shape: "circle",
      fill: null,
      colorPalette: ["#000001"],
      colorIndexes: new Uint8Array(n),
    };
    const target = styleContext();
    const targetRecord = target.ctx as unknown as Record<string, unknown>;
    targetRecord["canvas"] = { width: 800, height: 500 };
    targetRecord["getTransform"] = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    targetRecord["drawImage"] = () => {};

    expect(() => {
      drawBatch(target.ctx, batch, theme, resolve);
    }).not.toThrow();
    expect(target.calls.filter(({ name }) => name === "fill")).toHaveLength(1);
  });

  it("keeps the giant path for oversized palette colors with embedded alpha", () => {
    const n = 2_049;
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: new Float32Array(n * 2),
      rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
      size: 1.5,
      alpha: 0.7,
      shape: "circle",
      fill: null,
      colorPalette: ["#00000080"],
      colorIndexes: new Uint8Array(n),
    };
    const { target } = styleContextsWithScratch();

    drawBatch(target.ctx, batch, theme, resolve);

    expect(target.calls.filter(({ name }) => name === "drawImage")).toHaveLength(0);
    expect(target.calls.filter(({ name }) => name === "fill")).toHaveLength(1);
    expect(target.calls.filter(({ name }) => name === "arc")).toHaveLength(n);
  });

  it("traces constant-size circles with moveTo(x+r,y) + arc, no per-point style objects", () => {
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([10, 20, 30, 40]),
      rowIndex: Uint32Array.from([0, 1]),
      size: 1.5,
      alpha: 1,
      shape: "circle",
      fill: "red",
    };
    const { ctx, calls } = styleContext();
    drawBatch(ctx, batch, theme, resolve);
    const moves = calls.filter(({ name }) => name === "moveTo");
    const arcs = calls.filter(({ name }) => name === "arc");
    expect(moves.map(({ args }) => args.slice(0, 2))).toEqual([
      [11.5, 20],
      [31.5, 40],
    ]);
    expect(arcs.map(({ args }) => args.slice(0, 3))).toEqual([
      [10, 20, 1.5],
      [30, 40, 1.5],
    ]);
    expect(calls.filter(({ name }) => name === "fill")).toHaveLength(1);
  });

  it("applies adjacent path width/alpha/dash styles without reordering and resets dash", () => {
    const batch: PathsBatch = {
      kind: "paths",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([0, 0, 10, 10, 0, 10, 10, 20]),
      rowIndex: Uint32Array.from([0, 1, 2, 3]),
      pathOffsets: Uint32Array.from([0, 2, 4]),
      strokes: ["red", "blue"],
      linewidth: 1,
      linewidths: Float32Array.from([1, 5]),
      alpha: 1,
      alphas: Float32Array.from([0.3, 0.9]),
      linetypeIndexes: Uint8Array.from([0, 1]),
      curve: "linear",
    };
    const { ctx, calls, state, dash: currentDash } = styleContext();
    drawBatch(ctx, batch, theme, resolve);
    const strokes = calls.filter(({ name }) => name === "stroke");
    expect(strokes.map(({ width }) => width)).toEqual([1, 5]);
    expect(strokes.map(({ dash: dashPattern }) => dashPattern)).toEqual([[], [6, 4]]);
    expect(strokes.map(({ alpha }) => alpha)).toEqual([
      Math.fround(0.3) * 0.8,
      Math.fround(0.9) * 0.8,
    ]);
    expect(state.globalAlpha).toBe(0.8);
    expect(state.lineWidth).toBe(7);
    expect(currentDash()).toEqual([]);
  });

  it("strokes literal plus/cross shapes instead of filling open paths", () => {
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([10, 10]),
      rowIndex: Uint32Array.from([0]),
      size: 4,
      alpha: 1,
      shape: "plus",
      fill: "red",
    };
    const { ctx, calls, state } = styleContext();
    drawBatch(ctx, batch, theme, resolve);
    expect(calls.some(({ name }) => name === "stroke")).toBe(true);
    expect(calls.some(({ name }) => name === "fill")).toBe(false);
    expect(state.lineWidth).toBe(7);
  });
});
