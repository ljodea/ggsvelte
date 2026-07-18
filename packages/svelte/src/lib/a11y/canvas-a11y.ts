import type { CellValue, GeometryBatch, RenderModel } from "@ggsvelte/core";

/** Rows referenced by a canvas stratum, capped for the a11y table. */
export const A11Y_TABLE_CAP = 100;

/**
 * Distinct source-row indexes referenced by canvas batches.
 * Skips the `0xffffffff` missing-row sentinel. Shared by count-only and
 * materialise paths so sentinel / dedupe semantics cannot drift.
 *
 * Cost: O(P) time over primitive `rowIndex` entries, O(R) memory for the set
 * (R = distinct indexes). Does not sort or call `model.row`.
 */
export function collectCanvasRowIndexes(batches: readonly GeometryBatch[]): Set<number> {
  const rowSet = new Set<number>();
  for (const batch of batches) {
    for (const raw of batch.rowIndex) {
      if (raw !== 0xffffffff) rowSet.add(raw);
    }
  }
  return rowSet;
}

/**
 * Distinct canvas mark count for aria labels (source-row indexes, not
 * geometry primitives). O(P) scan, O(R) set — no sort, no row materialisation.
 */
export function a11yMarkCount(batches: readonly GeometryBatch[]): number {
  return collectCanvasRowIndexes(batches).size;
}

/**
 * Build the capped a11y data table for an open canvas stratum.
 *
 * - `total` = distinct source-row indexes (matches `a11yMarkCount`).
 * - `rows` = up to {@link A11Y_TABLE_CAP} materialised rows in ascending
 *   source-row index order; null `model.row` entries are skipped and do not
 *   count toward the cap.
 * - Sort cost O(R log R) only when materialising (open table); closed UIs
 *   should call {@link a11yMarkCount} instead.
 */
export function a11yRows(
  model: RenderModel,
  batches: GeometryBatch[],
): { fields: string[]; rows: CellValue[][]; total: number } {
  const rowSet = collectCanvasRowIndexes(batches);
  const fieldSet = new Set<string>();
  for (const batch of batches) {
    for (const f of model.layerFields[batch.layerIndex] ?? []) fieldSet.add(f.field);
  }
  const fields = [...fieldSet];
  const rows: CellValue[][] = [];
  // Full ascending sort of distinct indexes so null rows mid-stream still
  // advance to later indexes (CAP counts successful materialisations only).
  for (const index of [...rowSet].toSorted((a, b) => a - b)) {
    if (rows.length >= A11Y_TABLE_CAP) break;
    const row = model.row(index);
    if (row !== null) rows.push(fields.map((f) => row[f] ?? null));
  }
  return { fields, rows, total: rowSet.size };
}
