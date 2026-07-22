/**
 * Within-mark paint: pipeline resolution + SVG determinism + fallback mode (#591).
 */
import { describe, expect, it } from "bun:test";
import { aes, fillPaintLinear, gg, glow, strokePaintLinear } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.ts";
import { renderToSVGString } from "../src/render-svg.ts";
import type { PathsBatch } from "../src/scene.ts";
import { paintResourceId } from "../src/mark-paint.ts";

const size = { width: 320, height: 200 };

function ribbonWithPaint() {
  return gg(
    { x: [1, 2, 3], lo: [1, 2, 1.5], hi: [3, 4, 3.5] },
    aes({ x: "x", ymin: "lo", ymax: "hi" }),
  )
    .geomRibbon({
      alpha: 0.8,
      outline: "both",
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
      glow: glow({ color: "#00aaff", radius: 6, opacity: 0.4 }),
    })
    .spec();
}

describe("mark paint pipeline", () => {
  it("attaches resolved fillPaint, strokePaint, and glow with stable ids", () => {
    const model = runPipeline(ribbonWithPaint(), size);
    const closed = model.scene.batches.find(
      (b): b is PathsBatch => b.kind === "paths" && b.closed === true,
    );
    expect(closed).toBeDefined();
    expect(closed!.fillPaint).toMatchObject({
      kind: "linear",
      fallback: "#1f77b4",
      id: paintResourceId(0, "fill"),
    });
    expect(closed!.glow).toMatchObject({
      color: "#00aaff",
      radius: 6,
      id: paintResourceId(0, "glow"),
    });
    // Outline batch gets stroke paint.
    const outline = model.scene.batches.find(
      (b): b is PathsBatch => b.kind === "paths" && b.closed !== true,
    );
    expect(outline?.strokePaint?.id).toBe(paintResourceId(0, "stroke"));
    // Solid fallbacks land in fill/stroke colors for a11y and fallback mode.
    expect(closed!.fills?.[0]).toBe("#1f77b4");
  });

  it("stable resource ids do not use randomness or counters", () => {
    const a = runPipeline(ribbonWithPaint(), size);
    const b = runPipeline(ribbonWithPaint(), size);
    const fillA = (a.scene.batches[0] as PathsBatch).fillPaint?.id;
    const fillB = (b.scene.batches[0] as PathsBatch).fillPaint?.id;
    expect(fillA).toBe(fillB);
    expect(fillA).toBe("gg-paint-l0-p0-fill");
  });
});

describe("mark paint SVG", () => {
  it("emits deterministic gradient and glow defs", () => {
    const svg1 = renderToSVGString(ribbonWithPaint(), size);
    const svg2 = renderToSVGString(ribbonWithPaint(), size);
    expect(svg1).toBe(svg2);
    expect(svg1).toContain('id="gg-paint-l0-p0-fill"');
    expect(svg1).toContain('id="gg-paint-l0-p0-stroke"');
    expect(svg1).toContain('id="gg-paint-l0-p0-glow"');
    expect(svg1).toContain("linearGradient");
    expect(svg1).toContain("feGaussianBlur");
    expect(svg1).toContain('fill="url(#gg-paint-l0-p0-fill)"');
    expect(svg1).toContain('filter="url(#gg-paint-l0-p0-glow)"');
    // No raw CSS/filter injection vectors in paint attrs beyond closed defs.
    expect(svg1).not.toContain("url(#evil)");
    expect(svg1).not.toContain("javascript:");
  });

  it("fallback paint mode uses solid colors and omits glow", () => {
    const full = renderToSVGString(ribbonWithPaint(), { ...size, paintMode: "full" });
    const fallback = renderToSVGString(ribbonWithPaint(), {
      ...size,
      paintMode: "fallback",
    });
    expect(fallback).not.toContain("linearGradient");
    expect(fallback).not.toContain("feGaussianBlur");
    expect(fallback).not.toContain('filter="url(#gg-paint-l0-p0-glow)"');
    expect(fallback).toContain('fill="#1f77b4"');
    expect(full).toContain('fill="url(#gg-paint-l0-p0-fill)"');
  });

  it("facets still clip marks when paint is present", () => {
    const svg = renderToSVGString(
      gg(
        {
          x: [1, 2, 1, 2],
          lo: [0, 1, 0, 1],
          hi: [2, 3, 2, 3],
          g: ["a", "a", "b", "b"],
        },
        aes({ x: "x", ymin: "lo", ymax: "hi" }),
      )
        .geomRibbon({
          fillPaint: fillPaintLinear({
            x1: 0,
            y1: 0,
            x2: 1,
            y2: 0,
            stops: [
              { offset: 0, color: "#000" },
              { offset: 1, color: "#fff" },
            ],
            fallback: "#888",
          }),
        })
        .facet({ wrap: "g", ncol: 2 })
        .spec(),
      { width: 480, height: 240 },
    );
    expect(svg).toContain('clip-path="url(#gg-clip-0)"');
    expect(svg).toContain("gg-paint-l0");
  });
});
