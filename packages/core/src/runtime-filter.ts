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
      const included = clause.values.has(encodeKey(row[clause.field] ?? null));
      return clause.mode === "include" ? included : !included;
    });
}
