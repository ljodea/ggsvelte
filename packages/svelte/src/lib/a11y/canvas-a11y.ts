import type { CellValue, GeometryBatch, RenderModel } from "@ggsvelte/core";

/** Rows referenced by a canvas stratum, capped for the a11y table. */
export const A11Y_TABLE_CAP = 100;

export function a11yRows(
  model: RenderModel,
  batches: GeometryBatch[],
): { fields: string[]; rows: CellValue[][]; total: number } {
  const rowSet = new Set<number>();
  for (const batch of batches) {
    for (const raw of batch.rowIndex) {
      if (raw !== 0xffffffff) rowSet.add(raw);
    }
  }
  const fieldSet = new Set<string>();
  for (const batch of batches) {
    for (const f of model.layerFields[batch.layerIndex] ?? []) fieldSet.add(f.field);
  }
  const fields = [...fieldSet];
  const rows: CellValue[][] = [];
  for (const index of [...rowSet].toSorted((a, b) => a - b)) {
    if (rows.length >= A11Y_TABLE_CAP) break;
    const row = model.row(index);
    if (row !== null) rows.push(fields.map((f) => row[f] ?? null));
  }
  return { fields, rows, total: rowSet.size };
}
