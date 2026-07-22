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
    "closePath",
    "fill",
    "lineTo",
    "moveTo",
    "rect",
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
