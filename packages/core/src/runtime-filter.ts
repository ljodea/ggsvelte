import { encodeKey } from "./scales/state.js";
import type { CellValue } from "./table.js";

export type RuntimeRowFilterMode = "exclude" | "include";

/**
 * One data-changing filter produced by an interactive discrete legend.
 * Values stay raw and typed; display labels are never used as identity.
 */
export interface RuntimeRowFilterClause {
  readonly scale: "color" | "fill";
  readonly field: string;
  readonly values: readonly CellValue[];
  readonly mode: RuntimeRowFilterMode;
}

export type RuntimeRow = Readonly<Record<string, CellValue>>;
export type RuntimeRowFilter = (row: RuntimeRow) => boolean;
export type RuntimeRowIndexFilter = (rowIndex: number) => boolean;

/** Type-aware equality shared with stable categorical scale assignment. */
export function runtimeFilterValueEqual(left: CellValue, right: CellValue): boolean {
  return encodeKey(left) === encodeKey(right);
}

/**
 * Compile clauses once per pipeline run. Clauses compose with AND. The
 * returned predicate snapshots caller-owned arrays so mutation cannot change
 * a render already in progress.
 */
export function compileRuntimeRowFilter(
  clauses: readonly RuntimeRowFilterClause[],
): RuntimeRowFilter {
  const compiled = clauses.map((clause) => ({
    field: clause.field,
    mode: clause.mode,
    values: new Set(clause.values.map(encodeKey)),
  }));
  if (compiled.length === 0) return () => true;
  return (row) =>
    compiled.every((clause) => {
      const value = Object.hasOwn(row, clause.field) ? row[clause.field] : null;
      const included = clause.values.has(encodeKey(value));
      return clause.mode === "include" ? included : !included;
    });
}

/**
 * Compile the same typed clauses against columnar storage. Only referenced
 * columns are resolved, once per distinct field; no row objects are built.
 */
export function compileRuntimeRowIndexFilter(
  clauses: readonly RuntimeRowFilterClause[],
  column: (field: string) => readonly CellValue[],
): RuntimeRowIndexFilter {
  const columns = new Map<string, readonly CellValue[]>();
  const compiled = clauses.map((clause) => {
    let values = columns.get(clause.field);
    if (values === undefined) {
      values = column(clause.field);
      columns.set(clause.field, values);
    }
    return {
      column: values,
      mode: clause.mode,
      values: new Set(clause.values.map(encodeKey)),
    };
  });
  if (compiled.length === 0) return () => true;
  return (rowIndex) =>
    compiled.every((clause) => {
      const value = rowIndex < clause.column.length ? clause.column[rowIndex] : null;
      const included = clause.values.has(encodeKey(value));
      return clause.mode === "include" ? included : !included;
    });
}
