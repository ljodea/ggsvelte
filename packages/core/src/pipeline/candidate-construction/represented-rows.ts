import type { BarParams } from "@ggsvelte/spec";

import { bandKey } from "../../scales/train.js";
import type { ColumnTable } from "../../table.js";
import { shouldAggregateOnSemanticTemporalX } from "../frame-stats-shared.js";
import { positionColumn, xConversionOf, yConversionOf } from "../temporal-position.js";
import type { LayerBinding, LayerFrame } from "../types.js";

export function filterAggregateXRows(input: {
  table: ColumnTable;
  field: string;
  outputX: unknown;
  baseRows: readonly number[];
  /** When present, temporal summary/count keys match semantic epoch frame xValues. */
  binding?: LayerBinding;
}): number[] {
  const outputKey = bandKey(input.outputX);
  if (input.binding !== undefined) {
    const conversion = xConversionOf(input.binding);
    const parsed = input.table.parsed(input.field, conversion.sourceParser, conversion.options);
    if (shouldAggregateOnSemanticTemporalX(input.binding, parsed.decision.status)) {
      return input.baseRows.filter(
        (row) => bandKey(parsed.valid[row] === 1 ? parsed.semantic[row] : null) === outputKey,
      );
    }
  }
  const col = input.table.column(input.field);
  return input.baseRows.filter((row) => bandKey(col[row]) === outputKey);
}

export function filterBinRepresentedRows(input: {
  frame: LayerFrame;
  table: ColumnTable;
  frameRow: number;
  field: string;
  baseRows: readonly number[];
}): number[] {
  const { frame, table, frameRow, field, baseRows } = input;
  if (frame.xmin === null || frame.xmax === null) return [...baseRows];
  const hi = frame.xmax[frameRow]!;
  const lo = frame.xmin[frameRow]!;
  const closed = ((frame.binding.layer.params ?? {}) as BarParams).closed ?? "right";
  const frameGroup = frame.groups[frameRow];
  const firstInGroup = frameRow === 0 || frame.groups[frameRow - 1] !== frameGroup;
  const lastInGroup = frameRow === frame.n - 1 || frame.groups[frameRow + 1] !== frameGroup;
  // Edges are scale-space; filter source rows after the same transform.
  const numeric = positionColumn(
    table,
    field,
    xConversionOf(frame.binding),
    frame.binding.xTransform,
  );
  return baseRows.filter((row) => {
    const value = numeric[row]!;
    if (!Number.isFinite(value)) return false;
    return closed === "right"
      ? value <= hi && (value > lo || (firstInGroup && value >= lo))
      : value >= lo && (value < hi || (lastInGroup && value <= hi));
  });
}

export function filterAggregateYRows(input: {
  frame?: LayerFrame;
  table: ColumnTable;
  field: string;
  baseRows: readonly number[];
}): number[] {
  const binding = input.frame?.binding;
  const conversion = yConversionOf(binding ?? {});
  const numeric = positionColumn(input.table, input.field, conversion, binding?.yTransform);
  return input.baseRows.filter((row) => Number.isFinite(numeric[row]!));
}

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

  // Indexed group×x: buckets are the final represented membership (count: all
  // rows; summary/boxplot: finite-y only). Return the frozen array as-is so
  // LineageStore can WeakMap-intern once — no clone, no per-mark y re-filter.
  // Binned counts key by integer bin id (frame.xBinId), not inverse centers.
  if (needsX && indexKeyPrefix !== null && input.sourceRowsByGroupX !== undefined) {
    const xKey =
      frame.binding.xBinning !== undefined && frame.xBinId !== null
        ? bandKey(frame.xBinId[frameRow]!)
        : bandKey(outputX);
    const indexed = input.sourceRowsByGroupX.get(`${indexKeyPrefix}:${xKey}`);
    if (indexed !== undefined) return indexed;
  }

  // Indexed bin membership (already final; bin never applies needsY).
  if (needsBin && indexKeyPrefix !== null && input.sourceRowsByGroupBin !== undefined) {
    const indexed = input.sourceRowsByGroupBin.get(`${indexKeyPrefix}:${frameRow}`);
    if (indexed !== undefined) return indexed;
  }

  // Fallback without index maps: clone then filter (parity with pure filters).
  let representedRows = [...input.baseRows];
  if (needsX) {
    representedRows = filterAggregateXRows({
      table,
      field: aggregateXField,
      outputX,
      baseRows: representedRows,
      binding: frame.binding,
    });
  } else if (needsBin) {
    representedRows = filterBinRepresentedRows({
      frame,
      table,
      frameRow,
      field: aggregateXField,
      baseRows: representedRows,
    });
  }

  if (needsY) {
    representedRows = filterAggregateYRows({
      frame,
      table,
      field: aggregateYField,
      baseRows: representedRows,
    });
  }

  return representedRows;
}
