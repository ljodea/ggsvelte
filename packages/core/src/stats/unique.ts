/**
 * stat_unique — first-wins row deduplication on aesthetic key columns.
 * Clean-room contract against ggplot2 public behavior (no R source).
 *
 * Keys are pre-materialized cell tuples (one entry per input row). Key tokens
 * collapse NaN with NaN and -0 with +0 (Object.is would keep signed zeros
 * distinct; template-number tokens intentionally do not).
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
    if (Number.isNaN(value)) return "nan";
    // `${-0}` and `${0}` are both "0" — collapse signed zero (Object.is would not).
    return `d:${value}`;
  }
  if (typeof value === "boolean") return value ? "t" : "f";
  if (typeof value === "string") return `s:${value}`;
  // ColumnTable cells are JSON scalars; non-scalars should not appear. Use
  // JSON.stringify so objects never collapse to the useless "[object Object]".
  return `o:${JSON.stringify(value)}`;
}

function rowKey(parts: readonly unknown[]): string {
  // Unit separator avoids accidental collisions between multi-field joins.
  return parts.map((part) => keyToken(part)).join("\u001F");
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
