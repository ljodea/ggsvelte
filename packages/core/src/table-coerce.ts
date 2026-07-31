/**
 * Field-type inference and numeric coercion helpers (no table instance).
 *
 * Free of `@js-temporal/polyfill` and free of the global date-string parser
 * (temporal-source-gate). ISO-like strings use {@link isoEpochMs}; full
 * temporal registry parsing lives behind the optional temporal runtime
 * (`installTemporal`).
 */
import { isIsoLikeString, isoEpochMs } from "./iso-epoch.js";
import { getTemporalRuntime } from "./temporal-runtime.js";
import type { CellValue, Discreteness, FieldType } from "./table-types.js";

/** Strict-enough ISO predicate retained for public import compatibility. */
export function isISODateString(value: string): boolean {
  return isIsoLikeString(value);
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
 * Deterministic field type inference. With the temporal runtime installed
 * (full package / tests), uses the shared strict registry. On the lean
 * render path, only ISO-like strings and Date values count as temporal.
 */
export function inferFieldType(column: readonly CellValue[]): FieldType {
  const runtime = getTemporalRuntime();
  if (runtime !== null) {
    const decision = runtime.parseColumn(column, "auto", {}).decision;
    return decision.status === "temporal" ? "temporal" : nonTemporalFieldType(column);
  }
  let sawIso = false;
  let sawNonIsoString = false;
  let sawNumber = false;
  let sawDate = false;
  for (const value of column) {
    if (value === null) continue;
    if (typeof value === "string") {
      if (isIsoLikeString(value)) sawIso = true;
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
    const epoch = isoEpochMs(value);
    if (epoch !== undefined) return epoch;
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
