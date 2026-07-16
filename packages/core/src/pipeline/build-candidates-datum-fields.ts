/**
 * Resolve tooltip field channels and source-value lookup for candidate datums.
 */
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";

import type { MappedField } from "./types.js";

export function resolveCandidateFieldChannels(fields: readonly MappedField[]): {
  xField: string | undefined;
  yField: string | undefined;
  colorField: string | undefined;
  fillField: string | undefined;
} {
  return {
    xField: fields.find((field) => field.channel === "x")?.field,
    yField: fields.find((field) => field.channel === "y")?.field,
    colorField: fields.find((field) => field.channel === "color")?.field,
    fillField: fields.find((field) => field.channel === "fill")?.field,
  };
}

export function makeSourceValueLookup(
  table: ColumnTable,
  sourceRow: number | null,
): (field: string | undefined) => CellValue {
  return (field) =>
    sourceRow === null || field === undefined ? null : table.column(field)[sourceRow]!;
}
