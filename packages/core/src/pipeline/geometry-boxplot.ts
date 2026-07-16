/**
 * Boxplot composite geometry from rects, segments, and outlier points.
 */
import type { BoxplotParams } from "@ggsvelte/spec";

import type { GeometryBatch, RectsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf, NO_ROW } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_BAR_WIDTH, removedWarning } from "./geometry-shared.js";

const DEFAULT_BOX_LINEWIDTH = 1;
/** Median line draws at 2× the box linewidth (ggplot2's fatten = 2). */
const BOX_MEDIAN_FATTEN = 2;
const DEFAULT_OUTLIER_SIZE = 1.5;

export function boxplotBatches(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  const { binding, n } = frame;
  const box = frame.box;
  if (
    box === null ||
    frame.ymin === null ||
    frame.ymax === null ||
    fx.xScale.type !== "band" ||
    fx.yScale.type === "band"
  ) {
    return [];
  }
  const params = (binding.layer.params ?? {}) as BoxplotParams;
  const widthFrac = (params.width ?? DEFAULT_BAR_WIDTH) * fx.xScale.step;
  const linewidth = params.linewidth ?? DEFAULT_BOX_LINEWIDTH;
  const alpha = params.alpha ?? 1;
  const yScale = fx.yScale;

  const centerPx: number[] = [];
  const halfPx: number[] = [];
  const rects: number[] = [];
  const rectRows: number[] = [];
  const keptRows: number[] = [];
  const whiskers: number[] = [];
  const whiskerRows: number[] = [];
  const medians: number[] = [];
  const medianRows: number[] = [];
  let removed = 0;

  const yPx = (v: number) => fx.innerHeight - yScale.normalize(v) * fx.innerHeight;

  for (let row = 0; row < n; row++) {
    const tc = fx.xScale.normalize(frame.xValues?.[row] ?? null);
    const lo = frame.ymin[row]!;
    const q1 = box.lower[row]!;
    const q2 = box.middle[row]!;
    const q3 = box.upper[row]!;
    const hi = frame.ymax[row]!;
    if (
      tc === undefined ||
      ![lo, q1, q2, q3, hi].every((v) => Number.isFinite(yScale.normalize(v)))
    ) {
      removed++;
      centerPx.push(NaN);
      halfPx.push(NaN);
      continue;
    }
    let center = tc;
    let w = widthFrac;
    if (frame.dodgeSlot !== null && frame.dodgeSlotCounts !== null) {
      const slotCount = Math.max(1, frame.dodgeSlotCounts[row]!);
      w = widthFrac / slotCount;
      center = tc + widthFrac * ((frame.dodgeSlot[row]! + 0.5) / slotCount - 0.5);
    }
    const cx = center * fx.innerWidth;
    const half = (w / 2) * fx.innerWidth;
    centerPx.push(cx);
    halfPx.push(half);
    // Box: lower..upper hinges.
    rects.push(cx - half, Math.min(yPx(q3), yPx(q1)), half * 2, Math.abs(yPx(q1) - yPx(q3)));
    rectRows.push(frame.rowIndex[row]!);
    keptRows.push(row);
    // Whiskers: hinge -> whisker end, both directions.
    whiskers.push(cx, yPx(q3), cx, yPx(hi), cx, yPx(q1), cx, yPx(lo));
    whiskerRows.push(frame.rowIndex[row]!, frame.rowIndex[row]!);
    // Median line across the box.
    medians.push(cx - half, yPx(q2), cx + half, yPx(q2));
    medianRows.push(frame.rowIndex[row]!);
  }
  removedWarning(removed, binding.index, warnings);
  if (keptRows.length === 0) return [];

  const rectsBatchOut: RectsBatch = {
    kind: "rects",
    layerIndex: binding.index,
    panelIndex: 0,
    rects: Float32Array.from(rects),
    rowIndex: Uint32Array.from(rectRows),
    fill: binding.fill.constant,
    fillRole: "paper",
    stroke: null,
    strokeWidth: linewidth,
    alpha,
  };
  if (fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null)) {
    rectsBatchOut.fills = keptRows.map((row) =>
      colorOf(
        fill,
        frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[row]!,
      ),
    );
  }

  const out: GeometryBatch[] = [
    {
      kind: "segments",
      layerIndex: binding.index,
      panelIndex: 0,
      segments: Float32Array.from(whiskers),
      rowIndex: Uint32Array.from(whiskerRows),
      stroke: null,
      linewidth,
      alpha,
    },
    rectsBatchOut,
    {
      kind: "segments",
      layerIndex: binding.index,
      panelIndex: 0,
      segments: Float32Array.from(medians),
      rowIndex: Uint32Array.from(medianRows),
      stroke: null,
      linewidth: linewidth * BOX_MEDIAN_FATTEN,
      alpha,
    },
  ];

  // Outliers as points, at their (possibly dodged) box's x.
  if (box.outlierY.length > 0) {
    const positions: number[] = [];
    const rowIndex: number[] = [];
    for (let i = 0; i < box.outlierY.length; i++) {
      const boxRow = box.outlierBox[i]!;
      const cx = centerPx[boxRow];
      const ty = yScale.normalize(box.outlierY[i]!);
      if (cx === undefined || Number.isNaN(cx) || Number.isNaN(ty)) continue;
      positions.push(cx, fx.innerHeight - ty * fx.innerHeight);
      rowIndex.push(NO_ROW);
    }
    if (rowIndex.length > 0) {
      out.push({
        kind: "points",
        layerIndex: binding.index,
        panelIndex: 0,
        positions: Float32Array.from(positions),
        rowIndex: Uint32Array.from(rowIndex),
        size: params.outlierSize ?? DEFAULT_OUTLIER_SIZE,
        alpha,
        shape: "circle",
        fill: null,
      });
    }
  }
  return out;
}

/**
 * Errorbar geometry: three segments per row — the vertical range plus the
 * two caps (cap width = params.width of a band step on discrete x, or of
 * the data resolution on continuous x).
 */
