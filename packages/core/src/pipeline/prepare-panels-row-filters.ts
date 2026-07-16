/**
 * Apply data-changing runtime row filters before facets, stats, and scales.
 */
import { compileRuntimeRowIndexFilter } from "../runtime-filter.js";
import type { RuntimeRowFilterClause } from "../runtime-filter.js";
import type { ColumnTable } from "../table.js";

export function applyRuntimeRowFilters(
  table: ColumnTable,
  clauses: readonly RuntimeRowFilterClause[] | undefined,
): { table: ColumnTable; sourceRows: number[] | null } {
  if (clauses === undefined || clauses.length === 0) return { table, sourceRows: null };
  const accepts = compileRuntimeRowIndexFilter(clauses, (field) =>
    table.has(field) ? table.column(field) : [],
  );
  const sourceRows: number[] = [];
  for (let index = 0; index < table.rowCount; index++) {
    if (accepts(index)) sourceRows.push(index);
  }
  return { table: table.subset(sourceRows), sourceRows };
}
