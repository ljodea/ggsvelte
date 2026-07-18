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
  let representedRows = [...input.baseRows];
  const stat = frame.binding.layer.stat ?? "identity";
  const aggregateXField = frame.binding.xField;
  const outputX = frame.xValues?.[frameRow] ?? frame.xNumeric?.[frameRow] ?? null;
  const group = input.group ?? frame.groups[frameRow] ?? 0;
  const panelIndex = input.panelIndex;
  const layerIndex = input.layerIndex;
  const indexKeyPrefix =
    panelIndex !== undefined && layerIndex !== undefined
      ? `${panelIndex}:${layerIndex}:${group}`
      : null;

  let narrowedByXOrBin = false;
  if (
    aggregateXField !== null &&
    outputX !== null &&
    (stat === "count" || stat === "summary" || stat === "boxplot")
  ) {
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
    narrowedByXOrBin = true;
  } else if (stat === "bin" && aggregateXField !== null) {
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
    narrowedByXOrBin = true;
  }

  const aggregateYField = frame.binding.yField;
  if ((stat === "smooth" || stat === "summary" || stat === "boxplot") && aggregateYField !== null) {
    // Full-group path (smooth, or summary/boxplot without x/bin narrowing): reuse
    // the once-per-group finite-y list. After x/bin narrowing, filter the smaller set.
    const cachedY =
      !narrowedByXOrBin && indexKeyPrefix !== null && input.sourceRowsByGroupY !== undefined
        ? input.sourceRowsByGroupY.get(indexKeyPrefix)
        : undefined;
    representedRows =
      cachedY ??
      filterAggregateYRows({
        table,
        field: aggregateYField,
        baseRows: representedRows,
      });
  }

  return representedRows;
}
