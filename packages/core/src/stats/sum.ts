/**
 * The sum stat (ggplot2's stat_sum / geom_count backbone).
 *
 * Stat output contract:
 *  - required inputs: x and y (any comparable CellValue). Neither may map
 *    after_stat columns (y is a position input, not a computed measure).
 *  - generated columns: `n` — row count per (group, x, y) cell (or weight
 *    sum when aes.weight is mapped); `prop` — n / sum(n) **within the same
 *    pre-stat group** (matches ggplot2 colour-group proportions).
 *  - grouping key: (group_id, x, y). Discrete style aesthetics already form
 *    group_id (decision 0005). Continuous colour/alpha mapped without grouping
 *    are carried first-seen — documented divergence when a carried column is
 *    not constant within a cell (no warning in v1).
 *  - missing-value policy: rows with null x or null y dropped; non-finite
 *    weights dropped. Pipeline warns removed-missing.
 *  - output order: first occurrence of (group, x, y) in row order.
 */
import type { CellValue } from "../table.js";
import { encodeKey } from "../scales/state.js";

export interface SumStatInput {
  x: readonly CellValue[];
  y: readonly CellValue[];
  groups: readonly number[];
  weights?: Float64Array | null;
  carried?: Readonly<Record<string, readonly CellValue[]>>;
}

export interface SumStatResult {
  x: CellValue[];
  y: CellValue[];
  groups: number[];
  n: Float64Array;
  prop: Float64Array;
  carried: Record<string, CellValue[]>;
  dropped: number;
}

export function statSum(input: SumStatInput): SumStatResult {
  const { x, y, groups, weights } = input;
  const carriedNames = Object.keys(input.carried ?? {});
  const comboIndex = new Map<string, number>();
  const outX: CellValue[] = [];
  const outY: CellValue[] = [];
  const outGroups: number[] = [];
  const counts: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];
  let dropped = 0;

  const nRows = Math.min(x.length, y.length, groups.length);
  for (let row = 0; row < nRows; row++) {
    const xv = x[row]!;
    const yv = y[row]!;
    if (xv === null || yv === null) {
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
    const key = `${group}|${encodeKey(xv)}|${encodeKey(yv)}`;
    let slot = comboIndex.get(key);
    if (slot === undefined) {
      slot = outX.length;
      comboIndex.set(key, slot);
      outX.push(xv);
      outY.push(yv);
      outGroups.push(group);
      counts.push(0);
      for (const name of carriedNames) {
        carried[name]!.push(input.carried![name]![row]!);
      }
    }
    counts[slot]! += w;
  }

  // prop = n / sum(n) within each pre-stat group
  const groupTotals = new Map<number, number>();
  for (let i = 0; i < outGroups.length; i++) {
    const g = outGroups[i]!;
    groupTotals.set(g, (groupTotals.get(g) ?? 0) + counts[i]!);
  }
  const prop = new Float64Array(counts.length);
  for (let i = 0; i < counts.length; i++) {
    const total = groupTotals.get(outGroups[i]!) ?? 0;
    prop[i] = total > 0 ? counts[i]! / total : 0;
  }

  return {
    x: outX,
    y: outY,
    groups: outGroups,
    n: Float64Array.from(counts),
    prop,
    carried,
    dropped,
  };
}
