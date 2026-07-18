/**
 * Reconstruct represented source rows for aggregate (stat-synthesized) marks.
 * Prefers O(1) pre-bucketed indexes when available; falls back to pure filters.
 */
import { bandKey } from "../scales/train.js";
import { ColumnTable } from "../table.js";

import {
  filterAggregateXRows,
  filterAggregateYRows,
  filterBinRepresentedRows,
} from "./build-candidates-lineage-filters.js";
import type { LayerFrame } from "./types.js";

export function filterRepresentedSourceRows(input: {
  frame: LayerFrame;
  table: ColumnTable;
  frameRow: number;
  baseRows: readonly number[];
  /** Series group of the mark (needed for index keys). */
  group?: number;
  panelIndex?: number;
  layerIndex?: number;
  sourceRowsByGroupX?: Map<string, number[]>;
  sourceRowsByGroupBin?: Map<string, number[]>;
  /** Precomputed finite-y rows per `${panel}:${layer}:${group}` (smooth/summary/boxplot). */
  sourceRowsByGroupY?: Map<string, number[]>;
}): number[] {
  const { frame, table, frameRow } = input;
  const stat = frame.binding.layer.stat ?? "identity";
  const aggregateXField = frame.binding.xField;
  const aggregateYField = frame.binding.yField;
  const outputX = frame.xValues?.[frameRow] ?? frame.xNumeric?.[frameRow] ?? null;
  const group = input.group ?? frame.groups[frameRow] ?? 0;
  const panelIndex = input.panelIndex;
  const layerIndex = input.layerIndex;
  const indexKeyPrefix =
    panelIndex !== undefined && layerIndex !== undefined
      ? `${panelIndex}:${layerIndex}:${group}`
      : null;

  const needsX =
    aggregateXField !== null &&
    outputX !== null &&
    (stat === "count" || stat === "summary" || stat === "boxplot");
  const needsBin = stat === "bin" && aggregateXField !== null;
  const needsY =
    (stat === "smooth" || stat === "summary" || stat === "boxplot") && aggregateYField !== null;

  // Full-group finite-y path (smooth; summary/boxplot without x/bin): return the
  // shared cached array before cloning baseRows — keeps resolve O(1) per mark.
  if (needsY && !needsX && !needsBin && indexKeyPrefix !== null && input.sourceRowsByGroupY) {
    const cachedY = input.sourceRowsByGroupY.get(indexKeyPrefix);
    if (cachedY !== undefined) return cachedY;
  }

  let representedRows = [...input.baseRows];
  if (needsX) {
    representedRows =
      (indexKeyPrefix !== null && input.sourceRowsByGroupX !== undefined
        ? input.sourceRowsByGroupX.get(`${indexKeyPrefix}:${bandKey(outputX)}`)
        : undefined) ??
      filterAggregateXRows({
        table,
        field: aggregateXField,
        outputX,
        baseRows: representedRows,
      });
  } else if (needsBin) {
    representedRows =
      (indexKeyPrefix !== null && input.sourceRowsByGroupBin !== undefined
        ? input.sourceRowsByGroupBin.get(`${indexKeyPrefix}:${frameRow}`)
        : undefined) ??
      filterBinRepresentedRows({
        frame,
        table,
        frameRow,
        field: aggregateXField,
        baseRows: representedRows,
      });
  }

  if (needsY) {
    representedRows = filterAggregateYRows({
      table,
      field: aggregateYField,
      baseRows: representedRows,
    });
  }

  return representedRows;
}
