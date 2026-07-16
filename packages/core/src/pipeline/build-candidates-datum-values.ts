/**
 * Resolve candidate logical x/y values from frame, annotation, or outlier paths.
 */
import type { CellValue } from "../table.js";

import type { LayerFrame } from "./types.js";

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
        ? (frame?.xValues?.[frameRow] ?? frame?.xNumeric?.[frameRow] ?? null)
        : sourceValue(xField)
      : (frame?.box?.outlierX[primitiveIndex] ?? null);

  const yValue = annotationRule
    ? annotationY
    : outlierSourceRow === null
      ? sourceRow === null
        ? (frame?.yNumeric?.[frameRow] ?? frame?.box?.middle[frameRow] ?? null)
        : sourceValue(yField)
      : (frame?.box?.outlierY[primitiveIndex] ?? null);

  return { xValue, yValue };
}
