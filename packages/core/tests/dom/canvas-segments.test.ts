import { describe, expect, it } from "bun:test";

import { drawStratum } from "../../src/dom/canvas.ts";
import type { ResolvedGradientPaint, ResolvedGlow } from "../../src/mark-paint.ts";
import type { SegmentsBatch } from "../../src/scene.ts";
import { recordingContext, resolve, scene } from "./canvas-fixtures.ts";

const panelLinearStroke: ResolvedGradientPaint = {
  kind: "linear",
  space: "panel",
  x1: 0,
  y1: 0,
  x2: 10,
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

const markLinearStroke: ResolvedGradientPaint = {
  ...panelLinearStroke,
  space: "mark",
  x1: 0,
  y1: 0,
  x2: 1,
  y2: 0,
};

const softGlow: ResolvedGlow = {
  color: "#0af",
  radius: 6,
  opacity: 0.4,
  id: "gg-paint-l0-p0-glow",
};

describe("drawStratum segment stroke batching", () => {
  const denseMono: SegmentsBatch = {
    kind: "segments",
    layerIndex: 0,
    panelIndex: 0,
    // 6 segments, mono stroke (no per-segment strokes array)
    segments: Float32Array.from([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11,
    ]),
    rowIndex: Uint32Array.from([0, 1, 2, 3, 4, 5]),
    stroke: "black",
    linewidth: 2,
    alpha: 1,
  };

  it("mono stroke: one stroke() for all segments (not one per edge)", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([denseMono]), [denseMono], resolve);
    // Panel clip also begins a path; count only paint strokes (with strokeStyle set).
    const strokes = calls.filter((c) => c.name === "stroke" && c.strokeStyle !== "");
    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.strokeStyle).toBe("black");
    expect(strokes[0]?.lineWidth).toBe(2);
    expect(calls.filter((c) => c.name === "moveTo")).toHaveLength(6);
    expect(calls.filter((c) => c.name === "lineTo")).toHaveLength(6);
  });

  it("traces coordinate-tessellated segment topology instead of its straight chord", () => {
    const curved: SegmentsBatch = {
      ...denseMono,
      segments: Float32Array.from([0, 0, 1, 1]),
      rowIndex: Uint32Array.from([0]),
      renderPositions: Float32Array.from([0, 0, 0.5, 1, 1, 1]),
      renderPathOffsets: Uint32Array.from([0, 3]),
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([curved]), [curved], resolve);
    expect(calls.filter((call) => call.name === "moveTo").map((call) => call.args)).toEqual([
      [0, 0],
    ]);
    expect(calls.filter((call) => call.name === "lineTo").map((call) => call.args)).toEqual([
      [0.5, 1],
      [1, 1],
    ]);
  });

  it("null stroke falls back to theme ink once for the mono path", () => {
    const themed: SegmentsBatch = { ...denseMono, stroke: null };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([themed]), [themed], resolve);
    const strokes = calls.filter((c) => c.name === "stroke" && c.strokeStyle !== "");
    expect(strokes).toHaveLength(1);
    // Identity resolve leaves themeVar() expressions intact (cssColorResolver peels them in prod).
    expect(strokes[0]?.strokeStyle).toBe("var(--gg-ink, black)");
  });

  it("empty segments issue no stroke()", () => {
    const empty: SegmentsBatch = {
      ...denseMono,
      segments: new Float32Array(0),
      rowIndex: new Uint32Array(0),
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([empty]), [empty], resolve);
    expect(calls.filter((c) => c.name === "stroke")).toHaveLength(0);
    expect(calls.filter((c) => c.name === "moveTo")).toHaveLength(0);
  });

  it("contiguous same-color runs collapse to one stroke per run", () => {
    const runBatch: SegmentsBatch = {
      kind: "segments",
      layerIndex: 0,
      panelIndex: 0,
      segments: Float32Array.from([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]),
      rowIndex: Uint32Array.from([0, 1, 2, 3]),
      stroke: null,
      strokes: ["red", "red", "blue", "blue"],
      linewidth: 1,
      alpha: 1,
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([runBatch]), [runBatch], resolve);
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(2);
    expect(strokes.map((c) => c.strokeStyle)).toEqual(["red", "blue"]);
    expect(calls.filter((c) => c.name === "moveTo")).toHaveLength(4);
  });

  it("alternating per-segment strokes keep one stroke per run (n runs)", () => {
    const alt: SegmentsBatch = {
      kind: "segments",
      layerIndex: 0,
      panelIndex: 0,
      segments: Float32Array.from([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]),
      rowIndex: Uint32Array.from([0, 1, 2]),
      stroke: null,
      strokes: ["red", "blue", "red"],
      linewidth: 1,
      alpha: 1,
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([alt]), [alt], resolve);
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(3);
    expect(strokes.map((c) => c.strokeStyle)).toEqual(["red", "blue", "red"]);
  });

  it("mixed focus mask: mono batch strokes once per pass (muted then focused)", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([denseMono]), [denseMono], resolve, {
      focusMasks: [Uint8Array.from([1, 0, 1, 0, 1, 0])],
      mutedAlpha: 0.3,
    });
    const strokes = calls.filter((c) => c.name === "stroke");
    // muted pass + focused pass
    expect(strokes).toHaveLength(2);
    expect(strokes.map((c) => c.alpha).toSorted((a, b) => a - b)).toEqual([0.3, 1]);
    // 3 muted + 3 focused endpoints
    expect(calls.filter((c) => c.name === "moveTo")).toHaveLength(6);
  });

  it("all-focused mask: single mono stroke; empty-inclusion pass issues no stroke", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([denseMono]), [denseMono], resolve, {
      focusMasks: [Uint8Array.from([1, 1, 1, 1, 1, 1])],
      mutedAlpha: 0.3,
    });
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.alpha).toBe(1);
    expect(calls.filter((c) => c.name === "moveTo")).toHaveLength(6);
  });

  it("masked multi-color runs skip excluded mid-run without empty stroke", () => {
    // red, blue, red — exclude blue: contiguous reds stay separate runs (not merged)
    const batch: SegmentsBatch = {
      kind: "segments",
      layerIndex: 0,
      panelIndex: 0,
      segments: Float32Array.from([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]),
      rowIndex: Uint32Array.from([0, 1, 2]),
      stroke: null,
      strokes: ["red", "blue", "red"],
      linewidth: 1,
      alpha: 1,
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([batch]), [batch], resolve, {
      focusMasks: [Uint8Array.from([1, 0, 1])],
      mutedAlpha: 0.25,
    });
    // muted: blue only → 1 stroke; focused: red, red as two runs → 2 strokes
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(3);
    const muted = strokes.filter((c) => c.alpha === 0.25);
    const focused = strokes.filter((c) => c.alpha === 1);
    expect(muted.map((c) => c.strokeStyle)).toEqual(["blue"]);
    expect(focused.map((c) => c.strokeStyle)).toEqual(["red", "red"]);
  });
});

describe("drawStratum segment strokePaint and glow", () => {
  const twoSeg: SegmentsBatch = {
    kind: "segments",
    layerIndex: 0,
    panelIndex: 0,
    // (0,0)-(10,0) and (0,10)-(20,10)
    segments: Float32Array.from([0, 0, 10, 0, 0, 10, 20, 10]),
    rowIndex: Uint32Array.from([0, 1]),
    stroke: "#111111",
    linewidth: 2,
    alpha: 1,
  };

  it("panel-space mono strokePaint builds one linear gradient for the batch", () => {
    const batch: SegmentsBatch = { ...twoSeg, strokePaint: panelLinearStroke };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([batch]), [batch], resolve);
    const creates = calls.filter((c) => c.name === "createLinearGradient");
    expect(creates).toHaveLength(1);
    expect(creates[0]?.args).toEqual([0, 0, 10, 0]);
    expect(creates[0]?.stops).toEqual([
      { offset: 0, color: "#111111" },
      { offset: 1, color: "#eeeeee" },
    ]);
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(1);
    // Gradient object, not a solid color string.
    expect(typeof strokes[0]?.strokeStyle).toBe("object");
  });

  it("panel-space paint with per-segment strokes still uses one gradient per run", () => {
    const batch: SegmentsBatch = {
      ...twoSeg,
      stroke: null,
      strokes: ["red", "red"],
      strokePaint: panelLinearStroke,
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([batch]), [batch], resolve);
    expect(calls.filter((c) => c.name === "createLinearGradient")).toHaveLength(1);
    expect(calls.filter((c) => c.name === "stroke")).toHaveLength(1);
  });

  it("mark-space strokePaint builds one gradient per segment from segment AABB", () => {
    const batch: SegmentsBatch = { ...twoSeg, strokePaint: markLinearStroke };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([batch]), [batch], resolve);
    const creates = calls.filter((c) => c.name === "createLinearGradient");
    expect(creates).toHaveLength(2);
    // Segment 0: x 0..10, y 0..0 → height clamped to 1e-6; mark x maps 0→0, 1→10.
    expect(creates[0]?.args[0]).toBeCloseTo(0);
    expect(creates[0]?.args[2]).toBeCloseTo(10);
    // Segment 1: x 0..20, y 10..10
    expect(creates[1]?.args[0]).toBeCloseTo(0);
    expect(creates[1]?.args[2]).toBeCloseTo(20);
    expect(calls.filter((c) => c.name === "stroke")).toHaveLength(2);
  });

  it("mark-space paint with tessellated positions uses path AABB not chord", () => {
    const batch: SegmentsBatch = {
      ...twoSeg,
      segments: Float32Array.from([0, 0, 10, 0]),
      rowIndex: Uint32Array.from([0]),
      // Peaks above the chord so AABB height is non-zero.
      renderPositions: Float32Array.from([0, 0, 5, 8, 10, 0]),
      renderPathOffsets: Uint32Array.from([0, 3]),
      strokePaint: markLinearStroke,
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([batch]), [batch], resolve);
    const creates = calls.filter((c) => c.name === "createLinearGradient");
    expect(creates).toHaveLength(1);
    // mark x: bounds.x + v * width → 0 + 1 * 10 = 10 for x2
    expect(creates[0]?.args[0]).toBeCloseTo(0);
    expect(creates[0]?.args[2]).toBeCloseTo(10);
    // y endpoints share y=0; mark y of 0 is bounds.y (0). Height of AABB is 8.
    expect(creates[0]?.args[1]).toBeCloseTo(0);
    expect(creates[0]?.args[3]).toBeCloseTo(0);
    // Topology still traces the tessellated path.
    expect(calls.filter((c) => c.name === "lineTo").map((c) => c.args)).toEqual([
      [5, 8],
      [10, 0],
    ]);
  });

  it("glow with opacity < 1 bakes rgba into shadowColor and restores after draw", () => {
    const batch: SegmentsBatch = { ...twoSeg, glow: softGlow };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([batch]), [batch], resolve);
    const strokes = calls.filter((c) => c.name === "stroke");
    // Mono batch: one paint stroke with glow applied for the whole path.
    expect(strokes).toHaveLength(1);
    // #0af expands to #00aaff with opacity 0.4
    expect(strokes[0]?.shadowColor).toBe("rgba(0,170,255,0.4)");
    expect(strokes[0]?.shadowBlur).toBe(6);
    // Context restored after the batch so later strata do not inherit glow.
    expect(ctx.shadowColor).toBe("");
    expect(ctx.shadowBlur).toBe(0);
  });
});
