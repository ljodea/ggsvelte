/**
 * The count stat (ggplot2's stat_count; R-fixture-tested).
 *
 * Stat output contract (plan: "Stat output contracts"):
 *  - required inputs: the x channel (any type — each distinct value is one
 *    output slot). y must NOT be mapped to data (validate() enforces).
 *  - generated columns: `count` — the number of input rows per (x, group)
 *    combination, or the SUM of aes.weight when mapped (ggplot2's weight).
 *    `{ stat: "count" }` channels resolve to this column.
 *  - grouping behavior: counts are computed per group (the pre-stat group
 *    derivation, decision 0005); each output row belongs to one group.
 *  - carried columns: the x column keeps its field name; every discrete
 *    aes-mapped field is carried through (it is constant within a group).
 *  - missing-value policy: rows with null x are dropped with a warning
 *    (ggplot2's remove-missing); rows with a non-finite weight are dropped
 *    with a warning.
 *  - output order: first occurrence of (group, x) in row order (deterministic;
 *    ggplot2 orders by factor level instead — see decision 0008).
 */
import type { CellValue } from "../table.js";
import { encodeKey } from "../scales/state.js";

export interface CountStatInput {
  /** The x column (post-binding, pre-stat). */
  x: readonly CellValue[];
  /** Group id per input row (decision 0005 derivation). */
  groups: readonly number[];
  /** Optional weights (aes.weight); counts become weight sums. */
  weights?: Float64Array | null;
  /** Discrete carried columns (fieldName -> column), constant per group. */
  carried?: Readonly<Record<string, readonly CellValue[]>>;
}

export interface CountStatResult {
  /** One output row per (group, x) combination, first-seen order. */
  x: CellValue[];
  groups: number[];
  /** The generated `count` column. */
  count: Float64Array;
  /** Carried columns re-sampled to output rows. */
  carried: Record<string, CellValue[]>;
  /** Input rows dropped (null x / non-finite weight). */
  dropped: number;
}

export function statCount(input: CountStatInput): CountStatResult {
  const { x, groups, weights } = input;
  const carriedNames = Object.keys(input.carried ?? {});
  const comboIndex = new Map<string, number>();
  const outX: CellValue[] = [];
  const outGroups: number[] = [];
  const counts: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];
  let dropped = 0;

  for (let row = 0; row < x.length; row++) {
    const xv = x[row]!;
    if (xv === null) {
      dropped++;
      continue;
    }
    let w = 1;
    if (weights !== null && weights !== undefined) {
      w = weights[row]!;
      if (!Number.isFinite(w)) {
        dropped++;
        continue;
      }
    }
    const group = groups[row]!;
    const key = `${group}|${encodeKey(xv)}`;
    let slot = comboIndex.get(key);
    if (slot === undefined) {
      slot = outX.length;
      comboIndex.set(key, slot);
      outX.push(xv);
      outGroups.push(group);
      counts.push(0);
      for (const name of carriedNames) {
        carried[name]!.push(input.carried![name]![row]!);
      }
    }
    counts[slot]! += w;
  }

  return {
    x: outX,
    groups: outGroups,
    count: Float64Array.from(counts),
    carried,
    dropped,
  };
}
