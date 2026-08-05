/**
 * Canvas path paint: step curves, glow opacity, gradient strokePaint, solid-line hot path.
 */
import { describe, expect, it } from "bun:test";
import { fromPartial } from "@total-typescript/shoehorn";

import { drawBatch } from "../../src/dom/canvas-marks.ts";
import type { PathsBatch } from "../../src/scene.ts";
import type { ThemeTokens } from "../../src/theme.ts";
import type { ResolvedGradientPaint, ResolvedGlow } from "../../src/mark-paint.ts";

const theme = fromPartial<ThemeTokens>({ ink: "black", accent: "blue" });
const resolve = (color: string) => color;

const markStroke: ResolvedGradientPaint = {
  kind: "linear",
  space: "mark",
  x1: 0,
  y1: 0,
  x2: 1,
  y2: 0,
  cx: 0,
  cy: 0,
  r: 0,
  stops: [
    { offset: 0, color: "#111111", opacity: 1 },
    { offset: 1, color: "#eeeeee", opacity: 1 },
  ],
  fallback: "#111111",
  id: "gg-paint-l0-p0-stroke",
};

function paintContext() {
  const calls: {
    name: string;
    args: number[];
    strokeStyle: string | CanvasGradient;
    shadowColor: string;
    shadowBlur: number;
  }[] = [];
  const gradients: { args: number[]; stops: { offset: number; color: string }[] }[] = [];
  const target = {
    globalAlpha: 1,
    fillStyle: "" as string | CanvasGradient,
    strokeStyle: "" as string | CanvasGradient,
    lineWidth: 1,
    lineJoin: "miter",
    lineCap: "butt",
    shadowColor: "",
    shadowBlur: 0,
  };
  const methods = new Set([
    "beginPath",
    "closePath",
    "fill",
    "lineTo",
    "moveTo",
    "stroke",
    "setLineDash",
  ]);
  const snapshot = () => ({
    strokeStyle: target.strokeStyle,
    shadowColor: target.shadowColor,
    shadowBlur: target.shadowBlur,
  });
  const ctx = new Proxy(target, {
    get(object, property): unknown {
      if (property === "createLinearGradient") {
        return (...args: number[]) => {
          const stops: { offset: number; color: string }[] = [];
          gradients.push({ args: [...args], stops });
          return {
            addColorStop(offset: number, color: string) {
              stops.push({ offset, color });
            },
          };
        };
      }
      if (property === "createRadialGradient") {
        return (...args: number[]) => {
          const stops: { offset: number; color: string }[] = [];
          gradients.push({ args: [...args], stops });
          return {
            addColorStop(offset: number, color: string) {
              stops.push({ offset, color });
            },
          };
        };
      }
      if (typeof property === "string" && methods.has(property)) {
        return (...args: number[]) => {
          calls.push({ name: property, args, ...snapshot() });
        };
      }
      return Reflect.get(object, property);
    },
    set(object, property, value) {
      return Reflect.set(object, property, value);
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, gradients, target };
}

describe("drawPaths paint and curve edges", () => {
  it("solid multi-series linear lines use the monomorphic hot path (one stroke each)", () => {
    const batch: PathsBatch = {
      kind: "paths",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([0, 0, 1, 1, 2, 2, 3, 3]),
      rowIndex: Uint32Array.from([0, 0, 1, 1]),
      pathOffsets: Uint32Array.from([0, 2, 4]),
      strokes: ["red", "blue"],
      linewidth: 2,
      alpha: 1,
      curve: "linear",
    };
    const { ctx, calls } = paintContext();
    drawBatch(ctx, batch, theme, resolve);
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(2);
    expect(strokes.map((c) => c.strokeStyle)).toEqual(["red", "blue"]);
    // Hot path: clear dash once up front, then restore solid at the end —
    // never setLineDash per subpath.
    expect(calls.filter((c) => c.name === "setLineDash")).toHaveLength(2);
  });

  it("step curves insert intermediate corners between vertices", () => {
    const batch: PathsBatch = {
      kind: "paths",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([0, 0, 10, 10]),
      rowIndex: Uint32Array.from([0, 0]),
      pathOffsets: Uint32Array.from([0, 2]),
      strokes: ["black"],
      linewidth: 1,
      alpha: 1,
      curve: "step",
    };
    const { ctx, calls } = paintContext();
    drawBatch(ctx, batch, theme, resolve);
    const lineTos = calls.filter((c) => c.name === "lineTo").map((c) => c.args);
    // stepCorners inserts a corner between (0,0) and (10,10).
    expect(lineTos.length).toBeGreaterThan(1);
    expect(lineTos.at(-1)).toEqual([10, 10]);
  });

  it("glow with opacity < 1 bakes rgba into shadowColor and restores after draw", () => {
    const glow: ResolvedGlow = {
      color: "#0af",
      radius: 4,
      opacity: 0.5,
      id: "gg-paint-l0-p0-glow",
    };
    const batch: PathsBatch = {
      kind: "paths",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([0, 0, 5, 5]),
      rowIndex: Uint32Array.from([0, 0]),
      pathOffsets: Uint32Array.from([0, 2]),
      strokes: ["black"],
      linewidth: 1,
      alpha: 1,
      curve: "linear",
      glow,
    };
    const { ctx, calls, target } = paintContext();
    drawBatch(ctx, batch, theme, resolve);
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes.length).toBeGreaterThan(0);
    expect(strokes[0]?.shadowColor).toBe("rgba(0,170,255,0.5)");
    expect(strokes[0]?.shadowBlur).toBe(4);
    expect(target.shadowColor).toBe("");
    expect(target.shadowBlur).toBe(0);
  });

  it("mark-space strokePaint builds a linear gradient from subpath bounds", () => {
    const batch: PathsBatch = {
      kind: "paths",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([0, 0, 20, 0]),
      rowIndex: Uint32Array.from([0, 0]),
      pathOffsets: Uint32Array.from([0, 2]),
      strokes: ["#111111"],
      linewidth: 2,
      alpha: 1,
      curve: "linear",
      strokePaint: markStroke,
    };
    const { ctx, gradients, calls } = paintContext();
    drawBatch(ctx, batch, theme, resolve);
    expect(gradients).toHaveLength(1);
    // mark x maps 0→0 and 1→20 for a width-20 subpath
    expect(gradients[0]?.args[0]).toBeCloseTo(0);
    expect(gradients[0]?.args[2]).toBeCloseTo(20);
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(1);
    expect(typeof strokes[0]?.strokeStyle).toBe("object");
  });
});
