/**
 * Multi-table source-row identity for per-layer DataRef (#589).
 *
 * Each physical ColumnTable gets a contiguous global index range so
 * `model.row(globalIndex)` and candidate `rowIndex` stay a single number
 * while layers may bind distinct tables.
 */
import type { CellValue, ColumnTable } from "../table.js";

import { NO_ROW } from "./types-no-row.js";

export class SourceRegistry {
  readonly #tables: ColumnTable[] = [];
  /** Global base index for each sourceId (inclusive). */
  readonly #bases: number[] = [];
  #nextBase = 0;
  /** Reuse identity so shared/inherited tables keep the same namespace. */
  readonly #byIdentity = new WeakMap<ColumnTable, number>();

  /** Register a source table; returns its sourceId (stable for the same object). */
  register(table: ColumnTable): number {
    const existing = this.#byIdentity.get(table);
    if (existing !== undefined) return existing;
    const sourceId = this.#tables.length;
    this.#tables.push(table);
    this.#bases.push(this.#nextBase);
    this.#nextBase += table.rowCount;
    this.#byIdentity.set(table, sourceId);
    return sourceId;
  }

  /** Convert a local row index in `sourceId` to a global source-row id. */
  toGlobal(sourceId: number, localRow: number): number {
    if (localRow === NO_ROW || localRow < 0) return NO_ROW;
    const table = this.#tables[sourceId];
    if (table === undefined || localRow >= table.rowCount) return NO_ROW;
    return this.#bases[sourceId]! + localRow;
  }

  /** Look up a global source-row id produced by {@link toGlobal}. */
  row(globalIndex: number): Record<string, CellValue> | null {
    if (globalIndex === NO_ROW || globalIndex < 0) return null;
    // Linear search is fine: layer count is small; binary search over bases
    // would only matter for pathological source counts.
    for (let sourceId = this.#tables.length - 1; sourceId >= 0; sourceId--) {
      const base = this.#bases[sourceId]!;
      if (globalIndex < base) continue;
      const local = globalIndex - base;
      const table = this.#tables[sourceId]!;
      if (local >= table.rowCount) return null;
      const out: Record<string, CellValue> = {};
      for (const field of table.fields) out[field] = table.column(field)[local]!;
      return out;
    }
    return null;
  }

  getTable(sourceId: number): ColumnTable | undefined {
    return this.#tables[sourceId];
  }

  /** All registered unfiltered source tables (for multi-source catalog walks). */
  tables(): readonly ColumnTable[] {
    return this.#tables;
  }

  /** Empty placeholder table when the plot has no primary source. */
  get primaryTable(): ColumnTable | null {
    return this.#tables[0] ?? null;
  }
}
