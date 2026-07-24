/**
 * Renderer-neutral mark style resolution: one shape/dash/stroke table for
 * SVG, canvas, and Svelte serializers.
 */
import { describe, expect, it } from "bun:test";

import {
  areaOutlineActive,
  linetypeDash,
  pointShapeGeometry,
  pointShapePathD,
  resolvePathMark,
  resolvePointMark,
} from "../src/mark-paint.ts";

describe("pointShapeGeometry proportions", () => {
  it("triangle uses the shared 1.2 / 1.1 / 0.9 vertices", () => {
    // Literals from the historical SVG path (size=5 at 10,20): tip + base.
    const geom = pointShapeGeometry("triangle", 10, 20, 5);
    expect(geom).toEqual({
      kind: "polygon",
      mode: "fill",
      points: [
        [10, 14],
        [15.5, 24.5],
        [4.5, 24.5],
      ],
    });
  });

  it("diamond uses the shared 1.25 height vertices", () => {
    // Literals from the historical SVG path (size=4 at 0,0).
    const geom = pointShapeGeometry("diamond", 0, 0, 4);
    expect(geom).toEqual({
      kind: "polygon",
      mode: "fill",
      points: [
        [0, -5],
        [4, 0],
        [0, 5],
        [-4, 0],
      ],
    });
  });

  it("plus and cross are stroked line pairs with size/2 width", () => {
    expect(pointShapeGeometry("plus", 10, 10, 4)).toEqual({
      kind: "lines",
      mode: "stroke",
      strokeWidth: 2,
      segments: [
        [
          [6, 10],
          [14, 10],
        ],
        [
          [10, 6],
          [10, 14],
        ],
      ],
    });
    // cross arms are 0.75 * size; size=4 → 3.
    expect(pointShapeGeometry("cross", 10, 10, 4)).toEqual({
      kind: "lines",
      mode: "stroke",
      strokeWidth: 2,
      segments: [
        [
          [7, 7],
          [13, 13],
        ],
        [
          [13, 7],
          [7, 13],
        ],
      ],
    });
  });
});

describe("pointShapePathD", () => {
  it("emits closed polygon and open line path data", () => {
    const triangle = pointShapeGeometry("triangle", 10, 20, 5);
    if (triangle.kind !== "polygon") throw new Error("expected polygon");
    expect(pointShapePathD(triangle)).toBe("M10 14L15.5 24.5L4.5 24.5Z");

    const plus = pointShapeGeometry("plus", 10, 10, 4);
    if (plus.kind !== "lines") throw new Error("expected lines");
    expect(pointShapePathD(plus)).toBe("M6 10L14 10M10 6L10 14");
  });
});

describe("linetypeDash", () => {
  it("maps named linetypes to the shared dash table", () => {
    expect(linetypeDash("solid")).toEqual([]);
    expect(linetypeDash("dashed")).toEqual([6, 4]);
    expect(linetypeDash("dotted")).toEqual([1, 3]);
    expect(linetypeDash("dotdash")).toEqual([6, 3, 1, 3]);
    expect(linetypeDash("longdash")).toEqual([10, 4]);
    expect(linetypeDash("twodash")).toEqual([6, 3, 2, 3]);
  });
});

describe("areaOutlineActive", () => {
  it("requires a concrete stroke color and positive linewidth", () => {
    expect(areaOutlineActive("#111", 1)).toBe(true);
    expect(areaOutlineActive(null, 1)).toBe(false);
    expect(areaOutlineActive(undefined, 1)).toBe(false);
    expect(areaOutlineActive("#111", 0)).toBe(false);
  });
});

describe("resolvePointMark", () => {
  it("resolves fill, alpha, and shape geometry for one point", () => {
    const batch = {
      kind: "points" as const,
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([10, 20]),
      rowIndex: Uint32Array.from([0]),
      size: 5,
      alpha: 1,
      shape: "triangle" as const,
      fill: "#ff0000",
    };
    const style = resolvePointMark(batch, 0, "#111111");
    expect(style.fill).toBe("#ff0000");
    expect(style.alpha).toBe(1);
    expect(style.shape).toBe("triangle");
    expect(style.geometry.kind).toBe("polygon");
    expect(
      pointShapePathD(style.geometry as Extract<typeof style.geometry, { kind: "polygon" }>),
    ).toBe("M10 14L15.5 24.5L4.5 24.5Z");
  });

  it("falls back to theme ink when fill is null", () => {
    const batch = {
      kind: "points" as const,
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([0, 0]),
      rowIndex: Uint32Array.from([0]),
      size: 2,
      alpha: 1,
      shape: "circle" as const,
      fill: null,
    };
    expect(resolvePointMark(batch, 0, "#abcdef").fill).toBe("#abcdef");
  });
});

describe("resolvePathMark", () => {
  it("resolves area fill with inactive outline when stroke is null", () => {
    const batch = {
      kind: "paths" as const,
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([0, 0, 1, 1]),
      rowIndex: Uint32Array.from([0, 1]),
      pathOffsets: Uint32Array.from([0, 2]),
      strokes: [null],
      fills: ["#336699"],
      linewidth: 1,
      alpha: 1,
      curve: "linear" as const,
    };
    const style = resolvePathMark(batch, 0, { ink: "#111", accent: "#accent" });
    expect(style).toEqual({
      fill: "#336699",
      stroke: "none",
      width: 1,
      dash: [],
      alpha: 1,
      linecap: "round",
      linejoin: "round",
    });
  });

  it("resolves line stroke with dashed linetype", () => {
    const batch = {
      kind: "paths" as const,
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([0, 0, 1, 1]),
      rowIndex: Uint32Array.from([0, 1]),
      pathOffsets: Uint32Array.from([0, 2]),
      strokes: ["#00ff00"],
      linewidth: 2,
      alpha: 1,
      linetype: "dashed" as const,
      curve: "linear" as const,
    };
    const style = resolvePathMark(batch, 0, { ink: "#111", accent: "#accent" });
    expect(style.fill).toBe("none");
    expect(style.stroke).toBe("#00ff00");
    expect(style.width).toBe(2);
    expect(style.dash).toEqual([6, 4]);
  });
});
