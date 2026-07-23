/**
 * Portable within-mark paint: fillPaint / strokePaint / glow (#591).
 * Seam: validate(), normalize(), builder helpers.
 */
import { describe, expect, it } from "bun:test";
import {
  aes,
  fillPaintLinear,
  fillPaintRadial,
  gg,
  glow,
  normalize,
  strokePaintLinear,
  validate,
} from "../src/index.ts";

const ribbonData = { values: [{ x: 1, lo: 0, hi: 2 }] };
const ribbonAes = {
  x: { field: "x" },
  ymin: { field: "lo" },
  ymax: { field: "hi" },
};

const linearFill = {
  type: "linear" as const,
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 1,
  space: "mark" as const,
  stops: [
    { offset: 0, color: "#1f77b4" },
    { offset: 1, color: "#ff7f0e", opacity: 0.8 },
  ],
  fallback: "#1f77b4",
};

const radialFill = {
  type: "radial" as const,
  cx: 0.5,
  cy: 0.5,
  r: 0.75,
  space: "mark" as const,
  stops: [
    { offset: 0, color: "#ffffff" },
    { offset: 1, color: "#333333" },
  ],
  fallback: "#666666",
};

const linearStroke = {
  type: "linear" as const,
  x1: 0,
  y1: 0.5,
  x2: 1,
  y2: 0.5,
  space: "panel" as const,
  stops: [
    { offset: 0, color: "#111111" },
    { offset: 1, color: "#eeeeee" },
  ],
  fallback: "#111111",
};

const boundedGlow = {
  color: "#00aaff",
  radius: 6,
  opacity: 0.45,
};

describe("mark paint schema (validate)", () => {
  it("accepts linear fillPaint, strokePaint, and glow on ribbon", () => {
    const result = validate({
      data: ribbonData,
      layers: [
        {
          geom: "ribbon",
          aes: ribbonAes,
          params: {
            fillPaint: linearFill,
            strokePaint: linearStroke,
            glow: boundedGlow,
            outline: "both",
          },
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts radial fillPaint on area", () => {
    const result = validate({
      data: { values: [{ x: 1, y: 2 }] },
      layers: [
        {
          geom: "area",
          aes: { x: { field: "x" }, y: { field: "y" } },
          params: { fillPaint: radialFill },
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects CSS filter/url injection in paint colors", () => {
    const result = validate({
      data: ribbonData,
      layers: [
        {
          geom: "ribbon",
          aes: ribbonAes,
          params: {
            fillPaint: {
              ...linearFill,
              stops: [
                { offset: 0, color: "url(#evil)" },
                { offset: 1, color: "#ff0000" },
              ],
              fallback: "filter: blur(9px)",
            },
          },
        },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects empty stops, out-of-range offsets, and inverted stop order", () => {
    const empty = validate({
      data: ribbonData,
      layers: [
        {
          geom: "ribbon",
          aes: ribbonAes,
          params: {
            fillPaint: { ...linearFill, stops: [] },
          },
        },
      ],
    });
    expect(empty.ok).toBe(false);

    const badOffset = validate({
      data: ribbonData,
      layers: [
        {
          geom: "ribbon",
          aes: ribbonAes,
          params: {
            fillPaint: {
              ...linearFill,
              stops: [
                { offset: -0.1, color: "#000000" },
                { offset: 1.5, color: "#ffffff" },
              ],
            },
          },
        },
      ],
    });
    expect(badOffset.ok).toBe(false);

    const unordered = validate(
      {
        data: ribbonData,
        layers: [
          {
            geom: "ribbon",
            aes: ribbonAes,
            params: {
              fillPaint: {
                ...linearFill,
                stops: [
                  { offset: 0.8, color: "#000000" },
                  { offset: 0.2, color: "#ffffff" },
                ],
              },
            },
          },
        ],
      },
      {},
    );
    expect(unordered.ok).toBe(false);
    if (!unordered.ok) {
      expect(unordered.errors.some((e) => e.code === "paint-stops-unordered")).toBe(true);
    }
  });

  it("rejects non-finite glow radius and excessive radius", () => {
    const nonFinite = validate({
      data: ribbonData,
      layers: [
        {
          geom: "ribbon",
          aes: ribbonAes,
          params: { glow: { color: "#fff", radius: Number.NaN, opacity: 0.5 } },
        },
      ],
    });
    expect(nonFinite.ok).toBe(false);

    const tooLarge = validate({
      data: ribbonData,
      layers: [
        {
          geom: "ribbon",
          aes: ribbonAes,
          params: { glow: { color: "#00ff00", radius: 999, opacity: 0.5 } },
        },
      ],
    });
    expect(tooLarge.ok).toBe(false);
  });

  it("rejects fillPaint on unsupported geoms (point params exclude paint)", () => {
    const result = validate({
      data: { values: [{ x: 1, y: 2 }] },
      layers: [
        {
          geom: "point",
          aes: { x: { field: "x" }, y: { field: "y" } },
          params: { fillPaint: linearFill },
        },
      ],
    });
    // PointParams does not admit fillPaint — closed schema rejects the property.
    expect(result.ok).toBe(false);
  });

  it("rejects fillPaint when fill is data-mapped", () => {
    const result = validate(
      {
        data: { values: [{ x: 1, lo: 0, hi: 2, g: "a" }] },
        layers: [
          {
            geom: "ribbon",
            aes: { ...ribbonAes, fill: { field: "g" } },
            params: { fillPaint: linearFill },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === "paint-scale-conflict")).toBe(true);
    }
  });
});

describe("mark paint normalize + builder", () => {
  it("normalizes paint hex colors to lowercase #rrggbb", () => {
    const spec = normalize({
      data: ribbonData,
      layers: [
        {
          geom: "ribbon",
          aes: { x: "x", ymin: "lo", ymax: "hi" },
          params: {
            fillPaint: {
              type: "linear",
              x1: 0,
              y1: 0,
              x2: 1,
              y2: 0,
              space: "mark",
              stops: [
                { offset: 0, color: "#ABC" },
                { offset: 1, color: "#DeF123" },
              ],
              fallback: "#F00",
            },
            glow: { color: "#0Af", radius: 4, opacity: 0.3 },
          },
        },
      ],
    });
    const params = spec.layers[0]!.params as {
      fillPaint: {
        stops: { color: string }[];
        fallback: string;
      };
      glow: { color: string };
    };
    expect(params.fillPaint.stops[0]!.color).toBe("#aabbcc");
    expect(params.fillPaint.stops[1]!.color).toBe("#def123");
    expect(params.fillPaint.fallback).toBe("#ff0000");
    expect(params.glow.color).toBe("#00aaff");
  });

  it("builder helpers produce the same paint as hand-written params", () => {
    const built = gg({ x: [1, 2], lo: [0, 1], hi: [2, 3] }, aes({ x: "x", ymin: "lo", ymax: "hi" }))
      .geomRibbon({
        fillPaint: fillPaintLinear({
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 1,
          stops: [
            { offset: 0, color: "#1f77b4" },
            { offset: 1, color: "#ff7f0e" },
          ],
          fallback: "#1f77b4",
        }),
        strokePaint: strokePaintLinear({
          x1: 0,
          y1: 0,
          x2: 1,
          y2: 0,
          space: "panel",
          stops: [
            { offset: 0, color: "#111111" },
            { offset: 1, color: "#eeeeee" },
          ],
          fallback: "#111111",
        }),
        glow: glow({ color: "#00aaff", radius: 6, opacity: 0.45 }),
        outline: "both",
      })
      .spec();

    expect(built.layers[0]).toMatchObject({
      geom: "ribbon",
      params: {
        fillPaint: {
          type: "linear",
          space: "mark",
          fallback: "#1f77b4",
        },
        strokePaint: {
          type: "linear",
          space: "panel",
        },
        glow: { color: "#00aaff", radius: 6, opacity: 0.45 },
        outline: "both",
      },
    });
  });

  it("builder radial helper is accepted", () => {
    const built = gg({ x: [1], y: [2] }, aes({ x: "x", y: "y" }))
      .geomArea({
        fillPaint: fillPaintRadial({
          cx: 0.5,
          cy: 0.5,
          r: 1,
          stops: [
            { offset: 0, color: "#fff" },
            { offset: 1, color: "#000" },
          ],
          fallback: "#888",
        }),
      })
      .spec();
    expect(built.layers[0]!.params).toMatchObject({
      fillPaint: { type: "radial", fallback: "#888888" },
    });
  });
});
