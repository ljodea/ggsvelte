/**
 * Reconstruct represented source rows for aggregate (stat-synthesized) marks.
 */
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
    representedRows = filterAggregateXRows({
      table,
      field: aggregateXField,
      outputX,
      baseRows: representedRows,
    });
  } else if (stat === "bin" && aggregateXField !== null) {
    representedRows = filterBinRepresentedRows({
      frame,
      table,
      frameRow,
      field: aggregateXField,
      baseRows: representedRows,
    });
  }

  const aggregateYField = frame.binding.yField;
  if ((stat === "smooth" || stat === "summary" || stat === "boxplot") && aggregateYField !== null) {
    representedRows = filterAggregateYRows({
      table,
      field: aggregateYField,
      baseRows: representedRows,
    });
  }

  return representedRows;
}
