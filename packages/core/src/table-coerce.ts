/**
 * Field-type inference and numeric coercion helpers (no table instance).
 *
 * Intentionally free of `@js-temporal/polyfill`. ISO-like strings use
 * `Date.parse`; full temporal registry parsing lives behind the optional
 * temporal runtime (`installTemporal`).
 */
import type { CellValue, Discreteness, FieldType } from "./table-types.js";

/** Loose ISO-8601 date/datetime detector (UTC and offset forms). */
const ISO_LIKE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** Strict-enough ISO predicate retained for public import compatibility. */
export function isISODateString(value: string): boolean {
  if (!ISO_LIKE.test(value)) return false;
  return Number.isFinite(Date.parse(value));
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

/**
 * Deterministic field type inference without the Temporal polyfill.
 * String columns that look like ISO dates are temporal; mixed/other strings
 * stay nominal. Full registry inference is available after installTemporal().
 */
export function inferFieldType(column: readonly CellValue[]): FieldType {
  let sawIso = false;
  let sawNonIsoString = false;
  let sawNumber = false;
  let sawDate = false;
  for (const value of column) {
    if (value === null) continue;
    if (typeof value === "string") {
      if (isISODateString(value)) sawIso = true;
      else sawNonIsoString = true;
      continue;
    }
    if (typeof value === "boolean") return "nominal";
    if (typeof value === "number") {
      sawNumber = true;
      continue;
    }
    if (value instanceof Date && Number.isFinite(value.getTime())) {
      sawDate = true;
      continue;
    }
    return "nominal";
  }
  if (sawNonIsoString) return "nominal";
  if (sawIso && !sawNumber) return "temporal";
  if (sawDate && !sawNumber && !sawIso) return "temporal";
  if (sawIso && sawNumber) return "nominal";
  if (sawDate && sawNumber) return "nominal";
  return "quantitative";
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
    if (ISO_LIKE.test(value)) {
      const epoch = Date.parse(value);
      if (Number.isFinite(epoch)) return epoch;
    }
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
