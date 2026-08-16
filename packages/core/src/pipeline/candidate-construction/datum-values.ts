import type { CellValue } from "../../table.js";
import { signedStackSegmentHeight } from "../position-bar.js";
import { isBarLike } from "../scale-axis-train.js";
import type { LayerFrame, ResolvedColorScale } from "../types.js";

/**
 * O(1) assignment rank, or -1 when scale/field does not apply.
 * `readValue` is a thunk so sequential/null scales never force a cell read.
 */
function ordinalColorRank(
  resolved: ResolvedColorScale | null,
  field: string | null | undefined,
  readValue: () => CellValue,
): number {
  if (
    (resolved?.kind !== "ordinal" && resolved?.kind !== "manual") ||
    field === null ||
    field === undefined
  )
    return -1;
  return resolved.scale.indexOf(readValue()) ?? -1;
}

export function ordinalSeriesRank(input: {
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  colorField: string | undefined;
  fillField: string | undefined;
  sourceRow: number | null;
  sourceValue: (field: string | undefined) => CellValue;
  group: number;
}): number {
  const { color, fill, colorField, fillField, sourceRow, sourceValue, group } = input;
  if (sourceRow === null) return group;
  const colorRank = ordinalColorRank(color, colorField, () => sourceValue(colorField));
  const fillRank = ordinalColorRank(fill, fillField, () => sourceValue(fillField));
  return colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group;
}

function semanticFrameNumber(
  frame: LayerFrame | undefined,
  axis: "x" | "y",
  value: number | undefined,
): CellValue {
  if (value === undefined || !Number.isFinite(value)) return value ?? null;
  const transform =
    axis === "x" ? frame?.binding.xTransform?.transform : frame?.binding.yTransform?.transform;
  return transform === undefined ? value : transform.inverse(value);
}

function frameLogicalX(frame: LayerFrame | undefined, frameRow: number): CellValue {
  return frame?.xValues?.[frameRow] ?? semanticFrameNumber(frame, "x", frame?.xNumeric?.[frameRow]);
}

function frameLogicalY(frame: LayerFrame | undefined, frameRow: number): CellValue {
  return (
    frame?.yValues?.[frameRow] ??
    semanticFrameNumber(frame, "y", frame?.yNumeric?.[frameRow] ?? frame?.box?.middle[frameRow])
  );
}

export function resolveCandidateLogicalValues(input: {
  annotationRule: boolean;
  annotationX: CellValue;
  annotationY: CellValue;
  outlierSourceRow: number | null;
  sourceRow: number | null;
  frame: LayerFrame | undefined;
  frameRow: number;
  primitiveIndex: number;
  sourceValue: (field: string | undefined) => CellValue;
  xField: string | undefined;
  yField: string | undefined;
}): { xValue: CellValue; yValue: CellValue } {
  const {
    annotationRule,
    annotationX,
    annotationY,
    outlierSourceRow,
    sourceRow,
    frame,
    frameRow,
    primitiveIndex,
    sourceValue,
    xField,
    yField,
  } = input;

  // Identity rows read mapped source columns. When a channel is after_stat only
  // (bindot: x/stackpos while sourceRow stays set for color/lineage — #803),
  // `xField`/`yField` are undefined and the frame holds the generated values.
  // Fall through to frame numerics rather than sourceValue(undefined) → null.
  const xValue = annotationRule
    ? annotationX
    : outlierSourceRow === null
      ? sourceRow === null || xField === undefined
        ? frameLogicalX(frame, frameRow)
        : sourceValue(xField)
      : (frame?.box?.outlierX[primitiveIndex] ?? null);

  const fallbackY =
    sourceRow === null || yField === undefined
      ? frameLogicalY(frame, frameRow)
      : sourceValue(yField);

  const yValue = annotationRule
    ? annotationY
    : outlierSourceRow === null
      ? stackOrFillInspectY(frame, frameRow, fallbackY)
      : semanticFrameNumber(frame, "y", frame?.box?.outlierY[primitiveIndex]);

  return { xValue, yValue };
}

/**
 * Inspect y after stack/fill: post-position height when the layer is a
 * bar-like stack/fill without a y transform; otherwise `fallback`.
 */
export function stackOrFillInspectY(
  frame: LayerFrame | undefined,
  frameRow: number,
  fallback: CellValue,
): CellValue {
  const stackHeight = stackOrFillSegmentHeight(frame, frameRow);
  return stackHeight === undefined ? fallback : semanticFrameNumber(frame, "y", stackHeight);
}

/**
 * Post-position segment height for bar-like stack/fill, or undefined when the
 * layer is not a bar/col/area under stack/fill (so smooth/errorbar ymin/ymax
 * bands are never mistaken for stack heights).
 */
function stackOrFillSegmentHeight(
  frame: LayerFrame | undefined,
  frameRow: number,
): number | undefined {
  if (frame === undefined || frame.ymin === null || frame.ymax === null) return undefined;
  // Partial frames (unit fixtures) may omit binding — treat as non-stack.
  const geom = frame.binding?.layer?.geom;
  if (geom === undefined || !isBarLike(geom)) return undefined;
  // Transformed measure axes stack in transform space; a height is not
  // invertible to a data value (log: 10^(a−b) = ratio). Keep prior path.
  if (frame.binding?.yTransform !== undefined) return undefined;
  const position = frame.binding?.layer?.position ?? "identity";
  if (position !== "stack" && position !== "fill") return undefined;
  const lo = frame.ymin[frameRow];
  const hi = frame.ymax[frameRow];
  if (lo === undefined || hi === undefined) return undefined;
  const signed = signedStackSegmentHeight(lo, hi);
  return Number.isFinite(signed) ? signed : undefined;
}
