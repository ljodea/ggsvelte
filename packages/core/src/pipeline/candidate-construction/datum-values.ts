import type { CellValue } from "../../table.js";
import type { LayerFrame, ResolvedColorScale } from "../types.js";

/**
 * O(1) assignment rank, or -1 when scale/field does not apply.
 * `readValue` is a thunk so sequential/null scales never force a cell read.
 */
export function ordinalColorRank(
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

  const xValue = annotationRule
    ? annotationX
    : outlierSourceRow === null
      ? sourceRow === null
        ? (frame?.xValues?.[frameRow] ??
          semanticFrameNumber(frame, "x", frame?.xNumeric?.[frameRow]))
        : sourceValue(xField)
      : (frame?.box?.outlierX[primitiveIndex] ?? null);

  const yValue = annotationRule
    ? annotationY
    : outlierSourceRow === null
      ? sourceRow === null
        ? (frame?.yValues?.[frameRow] ??
          semanticFrameNumber(
            frame,
            "y",
            frame?.yNumeric?.[frameRow] ?? frame?.box?.middle[frameRow],
          ))
        : sourceValue(yField)
      : semanticFrameNumber(frame, "y", frame?.box?.outlierY[primitiveIndex]);

  return { xValue, yValue };
}
