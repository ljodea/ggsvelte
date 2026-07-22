/**
 * Field-type inference and numeric coercion helpers (no table instance).
 */
import { inferTemporalColumn, parseTemporal } from "@ggsvelte/spec";

import type { CellValue, Discreteness, FieldType } from "./table-types.js";

/** Strict ISO predicate retained for public import compatibility. */
export function isISODateString(value: string): boolean {
  return parseTemporal(value, "iso").ok;
}

export function nonTemporalFieldType(column: readonly CellValue[]): FieldType {
  let sawNumber = false;
  let sawDate = false;
  let sawString = false;
  for (const value of column) {
    if (value === null) continue;
    switch (typeof value) {
      case "string":
        sawString = true;
        break;
      case "boolean":
        return "nominal";
      case "number":
        sawNumber = true;
        break;
      default:
        if (value instanceof Date && Number.isFinite(value.getTime())) sawDate = true;
        else return "nominal";
    }
  }
  if (sawString || (sawDate && sawNumber)) return "nominal";
  if (sawDate) return "temporal";
  return "quantitative";
}

/** Deterministic field type inference using the shared temporal registry. */
export function inferFieldType(column: readonly CellValue[]): FieldType {
  const temporal = inferTemporalColumn(column);
  return temporal.status === "temporal" ? "temporal" : nonTemporalFieldType(column);
}

export function discretenessOf(type: FieldType): Discreteness {
  return type === "nominal" ? "discrete" : "continuous";
}

/** One context-free numeric reading. Column temporal conversion uses parsed(). */
export function cellToNumber(value: CellValue): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const iso = parseTemporal(value, "iso");
    if (iso.ok) return iso.epochMs;
    const numeric = Number(value);
    return value.trim() === "" ? Number.NaN : numeric;
  }
  return Number.NaN;
}

/** Numeric view of a plain column (post-stat data outside a ColumnTable). */
export function cellsToNumeric(column: readonly CellValue[]): Float64Array {
  const out = new Float64Array(column.length);
  for (let index = 0; index < column.length; index++) out[index] = cellToNumber(column[index]!);
  return out;
}

/** Strict quantitative coercion for explicit linear/log scales. */
export function cellsToQuantitative(column: readonly CellValue[]): Float64Array {
  const out = new Float64Array(column.length);
  for (let index = 0; index < column.length; index++) {
    const value = column[index]!;
    out[index] =
      typeof value === "number"
        ? value
        : value instanceof Date
          ? value.getTime()
          : typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : Number.NaN;
  }
  return out;
}
