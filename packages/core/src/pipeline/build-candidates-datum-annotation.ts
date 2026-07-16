/**
 * Annotation-rule intercept values for identity candidates.
 */
import type { CellValue } from "../table.js";

import type { LayerFrame } from "./types.js";

export function resolveAnnotationIntercepts(input: {
  frame: LayerFrame | undefined;
  primitiveIndex: number;
}): {
  annotationRule: boolean;
  annotationX: CellValue;
  annotationY: CellValue;
} {
  const { frame, primitiveIndex } = input;
  if (frame?.binding.ruleForm !== "annotation") {
    return { annotationRule: false, annotationX: null, annotationY: null };
  }
  return {
    annotationRule: true,
    annotationX: frame.xIntercepts[primitiveIndex] ?? null,
    annotationY: frame.yIntercepts[primitiveIndex - frame.xIntercepts.length] ?? null,
  };
}
