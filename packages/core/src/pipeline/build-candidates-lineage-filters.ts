/**
 * Pure filters for reconstructing source rows represented by aggregate marks.
 */
import type { BarParams } from "@ggsvelte/spec";

import { bandKey } from "../scales/train.js";
import { cellToNumber, ColumnTable } from "../table.js";

import type { LayerFrame } from "./types.js";

export function filterAggregateXRows(input: {
  table: ColumnTable;
  field: string;
  outputX: unknown;
  baseRows: readonly number[];
}): number[] {
  const outputKey = bandKey(input.outputX);
  return input.baseRows.filter(
    (row) => bandKey(input.table.column(input.field)[row]) === outputKey,
  );
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
  return baseRows.filter((row) => {
    const value = cellToNumber(table.column(field)[row]!);
    if (!Number.isFinite(value)) return false;
    return closed === "right"
      ? value <= hi && (value > lo || (firstInGroup && value >= lo))
      : value >= lo && (value < hi || (lastInGroup && value <= hi));
  });
}

export function filterAggregateYRows(input: {
  table: ColumnTable;
  field: string;
  baseRows: readonly number[];
}): number[] {
  return input.baseRows.filter((row) =>
    Number.isFinite(cellToNumber(input.table.column(input.field)[row]!)),
  );
}
