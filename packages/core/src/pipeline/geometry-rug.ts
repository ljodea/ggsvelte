/**
 * geom_rug: short ticks along panel edges for marginal distributions (#806).
 *
 * Reuses SegmentsBatch packing (rule/segment). Length is a panel-fraction
 * (ggplot2 unit(0.03, "npc") analogue). Sides are panel-edge-relative and
 * do not flip with reversed scales.
 */
import type { RugParams } from "@ggsvelte/spec";

import type { SegmentsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf, removedWarning } from "./geometry-shared.js";
import type { ResolvedStyleScales } from "./geometry-style.js";
import { packSegmentsBatch } from "./geometry-segments-pack.js";

const DEFAULT_SIDES = "bl";
const DEFAULT_LENGTH = 0.03;

function parseRugSides(sides: string | undefined): Set<"b" | "l" | "t" | "r"> {
  const raw = sides && sides.length > 0 ? sides : DEFAULT_SIDES;
  const out = new Set<"b" | "l" | "t" | "r">();
  for (const ch of raw) {
    if (ch === "b" || ch === "l" || ch === "t" || ch === "r") out.add(ch);
  }
  return out;
}

export function rugBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  const { binding } = frame;
  const params = (binding.layer.params ?? {}) as RugParams;
  const sides = parseRugSides(params.sides);
  const length =
    typeof params.length === "number" && Number.isFinite(params.length) && params.length > 0
      ? Math.min(params.length, 1)
      : DEFAULT_LENGTH;

  const needX = sides.has("b") || sides.has("t");
  const needY = sides.has("l") || sides.has("r");
  if (needX && frame.xNumeric === null && frame.xValues === null) return null;
  if (needY && frame.yNumeric === null && frame.yValues === null) return null;

  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);

  // Worst case: every side emits for every row.
  const capacity = frame.n * sides.size;
  if (capacity === 0) return null;

  const segments = new Float32Array(capacity * 4);
  const rowIndex = new Uint32Array(capacity);
  const styleRows = new Uint32Array(capacity);
  const strokes = wantsColors ? Array.from<string>({ length: capacity }) : null;
  let kept = 0;
  let removed = 0;

  const W = fx.innerWidth;
  const H = fx.innerHeight;
  const tickH = length * H;
  const tickW = length * W;

  const push = (row: number, x0: number, y0: number, x1: number, y1: number): void => {
    const o = kept * 4;
    segments[o] = x0;
    segments[o + 1] = y0;
    segments[o + 2] = x1;
    segments[o + 3] = y1;
    rowIndex[kept] = frame.rowIndex[row]!;
    styleRows[kept] = row;
    if (wantsColors && color !== null && strokes !== null) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      strokes[kept] = colorOf(color, value);
    }
    kept++;
  };

  for (let row = 0; row < frame.n; row++) {
    let emitted = 0;

    if (needX) {
      const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
      if (!Number.isNaN(tx)) {
        const sx = tx * W;
        if (sides.has("b")) {
          push(row, sx, H, sx, H - tickH);
          emitted++;
        }
        if (sides.has("t")) {
          push(row, sx, 0, sx, tickH);
          emitted++;
        }
      }
    }

    if (needY) {
      const ty = positionOf(fx.yScale, frame.yNumeric, frame.yValues, row);
      if (!Number.isNaN(ty)) {
        const sy = H - ty * H;
        if (sides.has("l")) {
          push(row, 0, sy, tickW, sy);
          emitted++;
        }
        if (sides.has("r")) {
          push(row, W, sy, W - tickW, sy);
          emitted++;
        }
      }
    }

    // One removal unit per row that produced no ticks (all requested channels non-finite).
    if (emitted === 0) removed++;
  }

  removedWarning(removed, binding.index, warnings);
  if (kept === 0) return null;

  const outSegments = kept === capacity ? segments : segments.subarray(0, kept * 4).slice();
  const outRows = kept === capacity ? rowIndex : rowIndex.subarray(0, kept).slice();
  const outStyleRows = kept === capacity ? styleRows : styleRows.subarray(0, kept).slice();
  const outStrokes = strokes === null ? null : kept === capacity ? strokes : strokes.slice(0, kept);

  return packSegmentsBatch({
    frame,
    segments: outSegments,
    rowIndex: outRows,
    styleRows: outStyleRows,
    strokes: outStrokes,
    wantsColors,
    styles,
  });
}
