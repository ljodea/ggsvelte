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
  resolveGlyphMark,
  resolveRectMark,
  resolveSegmentMark,
} from "../src/mark-style.ts";
import type { GlyphsBatch, RectsBatch, SegmentsBatch } from "../src/scene.ts";

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

describe("resolveRectMark", () => {
  const THEME = { accent: "#accent", paper: "#paper", ink: "#ink" };
  const base: RectsBatch = {
    kind: "rects",
    layerIndex: 0,
    panelIndex: 0,
    rects: Float32Array.from([0, 0, 4, 4, 10, 0, 4, 4]),
    rowIndex: Uint32Array.from([0, 1]),
    fill: null,
    alpha: 1,
  };

  it("data fill wins; null falls to the accent role by default", () => {
    expect(resolveRectMark({ ...base, fills: ["#d00", "#0d0"] }, 1, THEME).fill).toBe("#0d0");
    expect(resolveRectMark({ ...base, fill: "#123456" }, 0, THEME).fill).toBe("#123456");
    expect(resolveRectMark(base, 0, THEME).fill).toBe("#accent");
  });

  it("fillRole paper substitutes the paper token (boxplot hollow boxes)", () => {
    expect(resolveRectMark({ ...base, fillRole: "paper" }, 0, THEME).fill).toBe("#paper");
  });

  it("no outline when stroke and strokes are both absent (bars/cols)", () => {
    const style = resolveRectMark(base, 0, THEME);
    expect(style.stroke).toBeUndefined();
    // Width stays at its default even when unused.
    expect(style.strokeWidth).toBe(1);
  });

  it("stroke null means theme ink outline", () => {
    expect(resolveRectMark({ ...base, stroke: null }, 0, THEME).stroke).toBe("#ink");
  });

  it("per-rect strokes win; a hole falls back to stroke then ink", () => {
    const strokes = ["#f0f"] as string[];
    expect(resolveRectMark({ ...base, strokes }, 0, THEME).stroke).toBe("#f0f");
    // Hole at index 1 with no constant stroke: strokes is present, so ink applies.
    expect(resolveRectMark({ ...base, strokes }, 1, THEME).stroke).toBe("#ink");
    expect(resolveRectMark({ ...base, strokes, stroke: "#777" }, 1, THEME).stroke).toBe("#777");
  });

  it("resolves per-rect stroke widths over the constant, default 1", () => {
    const outlined = { ...base, stroke: "#000" };
    expect(resolveRectMark({ ...outlined, strokeWidth: 3 }, 0, THEME).strokeWidth).toBe(3);
    expect(
      resolveRectMark(
        { ...outlined, strokeWidth: 3, strokeWidths: Float32Array.from([5, 7]) },
        1,
        THEME,
      ).strokeWidth,
    ).toBe(7);
  });

  it("maps constant linetype and per-rect linetype indexes to dashes", () => {
    expect(resolveRectMark(base, 0, THEME).dash).toEqual([]);
    expect(resolveRectMark({ ...base, linetype: "dashed" }, 0, THEME).dash).toEqual([6, 4]);
    // LINETYPE_NAMES order: index of "dotted" resolves per-rect over the constant.
    expect(
      resolveRectMark(
        { ...base, linetype: "dashed", linetypeIndexes: Uint8Array.from([0, 2]) },
        1,
        THEME,
      ).dash,
    ).toEqual([1, 3]);
  });

  it("alpha defaults to 1 and reads per-rect alphas", () => {
    expect(resolveRectMark(base, 0, THEME).alpha).toBe(1);
    expect(
      resolveRectMark({ ...base, alphas: Float32Array.from([0.25, 0.5]) }, 1, THEME).alpha,
    ).toBe(0.5);
  });
});

describe("resolveSegmentMark", () => {
  const base: SegmentsBatch = {
    kind: "segments",
    layerIndex: 0,
    panelIndex: 0,
    segments: Float32Array.from([0, 0, 5, 5, 10, 0, 15, 5]),
    rowIndex: Uint32Array.from([0, 1]),
    stroke: null,
    linewidth: 1,
    alpha: 1,
  };

  it("per-segment strokes win, then the constant, then theme ink", () => {
    expect(resolveSegmentMark({ ...base, strokes: ["#a00", "#0a0"] }, 1, "#ink").stroke).toBe(
      "#0a0",
    );
    expect(resolveSegmentMark({ ...base, stroke: "#00c" }, 0, "#ink").stroke).toBe("#00c");
    expect(resolveSegmentMark(base, 0, "#ink").stroke).toBe("#ink");
  });

  it("resolves per-segment linewidths over the constant", () => {
    expect(resolveSegmentMark({ ...base, linewidth: 2 }, 0, "#ink").width).toBe(2);
    expect(
      resolveSegmentMark(
        { ...base, linewidth: 2, linewidths: Float32Array.from([3, 4]) },
        1,
        "#ink",
      ).width,
    ).toBe(4);
  });

  it("maps linetype and per-segment indexes to dashes", () => {
    expect(resolveSegmentMark(base, 0, "#ink").dash).toEqual([]);
    expect(resolveSegmentMark({ ...base, linetype: "longdash" }, 0, "#ink").dash).toEqual([10, 4]);
    expect(
      resolveSegmentMark(
        { ...base, linetype: "longdash", linetypeIndexes: Uint8Array.from([0, 1]) },
        1,
        "#ink",
      ).dash,
    ).toEqual([6, 4]);
  });

  it("linecap stays undefined unless the batch opts in (rule batches keep renderer defaults)", () => {
    expect(resolveSegmentMark(base, 0, "#ink").linecap).toBeUndefined();
    expect(resolveSegmentMark({ ...base, linecap: "butt" }, 0, "#ink").linecap).toBe("butt");
  });

  it("alpha defaults to 1 and reads per-segment alphas", () => {
    expect(resolveSegmentMark(base, 0, "#ink").alpha).toBe(1);
    expect(
      resolveSegmentMark({ ...base, alphas: Float32Array.from([0.25, 0.75]) }, 0, "#ink").alpha,
    ).toBe(0.25);
  });
});

describe("resolveGlyphMark", () => {
  const base: GlyphsBatch = {
    kind: "glyphs",
    layerIndex: 0,
    panelIndex: 0,
    positions: Float32Array.from([0, 0, 10, 10]),
    rowIndex: Uint32Array.from([0, 1]),
    texts: ["a", "b"],
    color: null,
    size: 11,
    anchor: "middle",
    alpha: 1,
  };

  it("per-glyph colors win, then the constant, then theme ink", () => {
    expect(resolveGlyphMark({ ...base, colors: ["#111", "#222"] }, 1, "#ink").fill).toBe("#222");
    expect(resolveGlyphMark({ ...base, color: "#333" }, 0, "#ink").fill).toBe("#333");
    expect(resolveGlyphMark(base, 0, "#ink").fill).toBe("#ink");
  });

  it("resolves per-glyph sizes over the batch font size", () => {
    expect(resolveGlyphMark(base, 0, "#ink").size).toBe(11);
    expect(resolveGlyphMark({ ...base, sizes: Float32Array.from([14, 18]) }, 1, "#ink").size).toBe(
      18,
    );
  });

  it("alpha defaults to 1 and reads per-glyph alphas", () => {
    expect(resolveGlyphMark(base, 0, "#ink").alpha).toBe(1);
    expect(
      resolveGlyphMark({ ...base, alphas: Float32Array.from([0.5, 1]) }, 0, "#ink").alpha,
    ).toBe(0.5);
  });
});
