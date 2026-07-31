/**
 * Rect stroke/fill characterization for the canvas drawer — pins the outline
 * fallback chain (none / null-ink / per-rect holes) and per-rect widths so the
 * shared resolveRectMark conversion cannot drift.
 */
import { describe, expect, it } from "bun:test";

import { drawStratum } from "../../src/dom/canvas.ts";
import type { RectsBatch } from "../../src/scene.ts";
import { recordingContext, rects, resolve, scene } from "./canvas-fixtures.ts";

describe("drawStratum rect outlines", () => {
  it("no stroke and no strokes means fills only, no outline pass", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([rects]), [rects], resolve);
    expect(calls.filter((c) => c.name === "fillRect")).toHaveLength(2);
    expect(calls.filter((c) => c.name === "strokeRect")).toHaveLength(0);
    expect(calls.find((c) => c.name === "fillRect")?.fillStyle).toBe("blue");
  });

  it("null stroke outlines every rect with theme ink at default width 1", () => {
    const outlined: RectsBatch = { ...rects, stroke: null };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([outlined]), [outlined], resolve);
    const strokeRects = calls.filter((c) => c.name === "strokeRect");
    expect(strokeRects).toHaveLength(2);
    // Identity resolve leaves themeVar() intact (cssColorResolver peels in prod).
    expect(strokeRects[0]?.strokeStyle).toBe("var(--gg-ink, black)");
    expect(strokeRects[0]?.lineWidth).toBe(1);
  });

  it("per-rect strokes win and holes fall back to constant stroke", () => {
    const outlined: RectsBatch = {
      ...rects,
      stroke: "#777777",
      strokes: ["#ff00ff"] as string[],
      strokeWidth: 2,
      strokeWidths: Float32Array.from([5, 7]),
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([outlined]), [outlined], resolve);
    const strokeRects = calls.filter((c) => c.name === "strokeRect");
    expect(strokeRects.map((c) => c.strokeStyle)).toEqual(["#ff00ff", "#777777"]);
    expect(strokeRects.map((c) => c.lineWidth)).toEqual([5, 7]);
  });

  it("null fill uses the paper role when fillRole says so", () => {
    const hollow: RectsBatch = { ...rects, fill: null, fillRole: "paper" };
    const { ctx, calls } = recordingContext();
    const hollowScene = scene([hollow]);
    hollowScene.theme.paper = "white";
    drawStratum(ctx, hollowScene, [hollow], resolve);
    expect(calls.find((c) => c.name === "fillRect")?.fillStyle).toBe("var(--gg-paper, white)");
  });

  it("per-rect alphas multiply into the fill pass", () => {
    const faded: RectsBatch = { ...rects, alphas: Float32Array.from([0.25, 0.5]) };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([faded]), [faded], resolve);
    expect(calls.filter((c) => c.name === "fillRect").map((c) => c.alpha)).toEqual([0.25, 0.5]);
  });
});
