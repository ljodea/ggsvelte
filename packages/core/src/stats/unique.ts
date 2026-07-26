/**
 * stat_unique — first-wins row deduplication on aesthetic key columns.
 * Clean-room contract against ggplot2 public behavior (no R source).
 *
 * Keys are pre-materialized cell tuples (one entry per input row). Equality
 * uses Object.is so NaN collapses with NaN and -0 equals +0.
 */

export interface StatUniqueInput {
  /** Per-row key tuples (same length as row count). */
  readonly keys: readonly (readonly unknown[])[];
}

export interface StatUniqueResult {
  /** Ascending panel-local indices of kept rows (first occurrence wins). */
  readonly keep: readonly number[];
}

function keyToken(value: unknown): string {
  if (value === null) return "n";
  if (value === undefined) return "u";
  if (typeof value === "number") {
    if (Object.is(value, -0)) return "z-";
    if (Number.isNaN(value)) return "nan";
    return `d:${value}`;
  }
  if (typeof value === "boolean") return value ? "t" : "f";
  if (typeof value === "string") return `s:${value}`;
  // Cells are JSON scalars in ColumnTable; anything else stringifies stably enough for equality.
  return `o:${String(value)}`;
}

function rowKey(parts: readonly unknown[]): string {
  // Unit separator avoids accidental collisions between multi-field joins.
  return parts.map(keyToken).join("\u001f");
}

/**
 * Return indices of first-seen unique keys in input order.
 * Empty key rows (zero-length tuples) still participate — all-empty keys collapse to one row.
 */
export function statUnique(input: StatUniqueInput): StatUniqueResult {
  const { keys } = input;
  const seen = new Set<string>();
  const keep: number[] = [];
  for (let i = 0; i < keys.length; i++) {
    const token = rowKey(keys[i]!);
    if (seen.has(token)) continue;
    seen.add(token);
    keep.push(i);
  }
  return { keep };
}
