import { encodeKey } from "./scales/state.js";
import type { CellValue } from "./table.js";

export type RuntimeRowFilterMode = "exclude" | "include";

/**
 * One data-changing filter produced by an interactive discrete legend.
 * Values stay raw and typed; display labels are never used as identity.
 */
export interface RuntimeRowFilterClause {
  readonly scale: "color" | "fill" | "size" | "linewidth" | "alpha" | "shape" | "linetype";
  readonly field: string;
  readonly values: readonly CellValue[];
  readonly mode: RuntimeRowFilterMode;
}

export type RuntimeRowIndexFilter = (rowIndex: number) => boolean;

/**
 * Compile typed clauses against columnar storage. Clauses compose with AND.
 * Only referenced columns are resolved, once per distinct field; no row
 * objects are built. The returned predicate snapshots caller-owned arrays so
 * mutation cannot change a render already in progress.
 *
 * Equality is {@link encodeKey} (Date by getTime, NaN ≡ NaN; ±0 distinct) —
 * the same tokens used by discrete scale assignment.
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
