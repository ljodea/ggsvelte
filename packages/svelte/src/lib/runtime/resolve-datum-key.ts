/**
 * Resolve durable row identity for interaction (selection, legend focus, pin
 * rebind, linked controllers).
 *
 * Plot authors should not need a `key` prop for ordinary charts:
 * 1. Explicit `key` / accessor on GGPlot wins when provided (override).
 * 2. Else if plot data exposes a PropertyKey-valued `id` column → use `"id"`.
 * 3. Else use the row index (unique within the current row order).
 *
 * Index identity is enough for single-plot legend focus / inspect / local
 * selection. Custom durable identity across reorders or non-`id` natural keys
 * still uses the explicit `key` override (future: interaction-surface only).
 */
import type { CellValue } from "@ggsvelte/core";

export type DatumKey =
  | PropertyKey
  | ((row: Record<string, CellValue>, index: number) => PropertyKey);

export type ResolveDatumKeyInput = {
  /** Explicit GGPlot `key` prop when the author opts into a custom identity. */
  readonly explicit?: DatumKey | undefined;
  /** Plot data input (row array, DataRef, or bare columns map). */
  readonly data?: unknown;
};

/** Row-index identity — default when no `id` column and no explicit key. */
function rowIndexDatumKey(_row: Record<string, CellValue>, index: number): PropertyKey {
  return index;
}

/** True when `value` is a legal PropertyKey for semantic row identity. */
function isPropertyKeyIdentity(value: unknown): value is PropertyKey {
  return typeof value === "string" || typeof value === "number" || typeof value === "symbol";
}

/**
 * Detect a usable `id` column on plot data (first cell must be PropertyKey).
 * Does not scan every row for uniqueness — invalid/duplicate keys still emit
 * INTERACTION_* key diagnostics at resolve time.
 */
function dataHasIdIdentityColumn(data: unknown): boolean {
  if (data === null || data === undefined) return false;

  if (Array.isArray(data)) {
    if (data.length === 0) return false;
    const row: unknown = data[0];
    if (row === null || typeof row !== "object" || Array.isArray(row)) return false;
    return isPropertyKeyIdentity((row as Record<string, unknown>)["id"]);
  }

  if (typeof data !== "object") return false;
  const record = data as Record<string, unknown>;

  // DataRef { values: Row[] }
  if (Array.isArray(record["values"])) return dataHasIdIdentityColumn(record["values"]);

  // DataRef { columns: { id: [...] } } or bare column map with id array
  const columns =
    record["columns"] !== null &&
    typeof record["columns"] === "object" &&
    !Array.isArray(record["columns"])
      ? (record["columns"] as Record<string, unknown>)
      : record;
  const idColumn = columns["id"];
  if (!Array.isArray(idColumn) || idColumn.length === 0) return false;
  return isPropertyKeyIdentity(idColumn[0]);
}

/**
 * Resolve the datum-key used by the plot engine.
 * Always returns a key strategy — never `undefined`.
 */
export function resolveDatumKey(input: ResolveDatumKeyInput): DatumKey {
  if (input.explicit !== undefined) return input.explicit;
  if (dataHasIdIdentityColumn(input.data)) return "id";
  return rowIndexDatumKey;
}
