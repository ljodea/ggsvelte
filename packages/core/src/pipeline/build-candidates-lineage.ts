/**
 * Reconstruct represented source rows for aggregate (stat-synthesized) marks.
 */
import type { BarParams } from "@ggsvelte/spec";

import { bandKey } from "../scales/train.js";
import { cellToNumber, ColumnTable } from "../table.js";

import type { LayerFrame } from "./types.js";

export function filterRepresentedSourceRows(input: {
  frame: LayerFrame;
  table: ColumnTable;
  frameRow: number;
  baseRows: readonly number[];
}): number[] {
  const { frame, table, frameRow } = input;
  let representedRows = [...input.baseRows];
  const stat = frame.binding.layer.stat ?? "identity";
  const aggregateXField = frame.binding.xField;
  const outputX = frame.xValues?.[frameRow] ?? frame.xNumeric?.[frameRow] ?? null;

  if (
    aggregateXField !== null &&
    outputX !== null &&
    (stat === "count" || stat === "summary" || stat === "boxplot")
  ) {
    const outputKey = bandKey(outputX);
    representedRows = representedRows.filter(
      (row) => bandKey(table.column(aggregateXField)[row]) === outputKey,
    );
  } else if (
    stat === "bin" &&
    aggregateXField !== null &&
    frame.xmin !== null &&
    frame.xmax !== null
  ) {
    const hi = frame.xmax[frameRow]!;
    const lo = frame.xmin[frameRow]!;
    const closed = ((frame.binding.layer.params ?? {}) as BarParams).closed ?? "right";
    const frameGroup = frame.groups[frameRow];
    const firstInGroup = frameRow === 0 || frame.groups[frameRow - 1] !== frameGroup;
    const lastInGroup = frameRow === frame.n - 1 || frame.groups[frameRow + 1] !== frameGroup;
    representedRows = representedRows.filter((row) => {
      const value = cellToNumber(table.column(aggregateXField)[row]!);
      if (!Number.isFinite(value)) return false;
      return closed === "right"
        ? value <= hi && (value > lo || (firstInGroup && value >= lo))
        : value >= lo && (value < hi || (lastInGroup && value <= hi));
    });
  }

  const aggregateYField = frame.binding.yField;
  if ((stat === "smooth" || stat === "summary" || stat === "boxplot") && aggregateYField !== null) {
    representedRows = representedRows.filter((row) =>
      Number.isFinite(cellToNumber(table.column(aggregateYField)[row]!)),
    );
  }

  return representedRows;
}
