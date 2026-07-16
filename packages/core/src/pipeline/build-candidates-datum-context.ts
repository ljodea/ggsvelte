/**
 * Resolve outlier/annotation context and series rank for identity candidates.
 */
import type { GeometryBatch } from "../scene.js";
import { bandKey } from "../scales/train.js";
import type { CellValue } from "../table.js";

import type { FacetPanelDef } from "./facets.js";
import type { LayerFrame, ResolvedColorScale } from "./types.js";

export function resolveOutlierContext(input: {
  frame: LayerFrame | undefined;
  batch: GeometryBatch;
  primitiveIndex: number;
  facetPanel: FacetPanelDef | undefined;
}): { outlierLocalRow: number | null; outlierSourceRow: number | null } {
  const { frame, batch, primitiveIndex, facetPanel } = input;
  const outlierLocalRow =
    frame?.box !== null && frame?.binding.layer.geom === "boxplot" && batch.kind === "points"
      ? (frame?.box.outlierRow[primitiveIndex] ?? null)
      : null;
  const outlierSourceRow =
    outlierLocalRow === null
      ? null
      : (facetPanel?.sourceRows?.[outlierLocalRow] ?? outlierLocalRow);
  return { outlierLocalRow, outlierSourceRow };
}

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
  const ordinalRank = (resolved: ResolvedColorScale | null, field: string | undefined) => {
    if (resolved?.kind !== "ordinal" || field === undefined || sourceRow === null) return -1;
    const key = bandKey(sourceValue(field));
    return resolved.scale.domain.findIndex((value) => bandKey(value) === key);
  };
  const colorRank = ordinalRank(color, colorField);
  const fillRank = ordinalRank(fill, fillField);
  return colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group;
}
