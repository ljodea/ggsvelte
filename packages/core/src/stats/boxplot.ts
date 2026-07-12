/**
 * The boxplot stat (ggplot2's stat_boxplot; R-fixture-tested).
 *
 * Stat output contract (plan: "Stat output contracts"):
 *  - required inputs: a DISCRETE x channel and a quantitative y channel
 *    (tier-2 `channel-type-mismatch` enforces the M2 scope).
 *  - generated columns, one output row per group: `ymin`, `lower`,
 *    `middle`, `upper`, `ymax` — hinges are TYPE-7 quantiles (the R
 *    default); whiskers extend to the furthest observation within
 *    coef × IQR of the hinges (coef default 1.5); when outliers exist,
 *    ymin/ymax move to the non-outlier range (ggplot2's rule). Values
 *    beyond the whiskers come back as individual `outliers` rows.
 *    The group's x value is carried as the positional output.
 *  - grouping behavior: one five-number summary per group (groups are the
 *    x × discrete-aes interaction, decision 0005).
 *  - missing-value policy (ggplot2 na.rm semantics): rows with missing /
 *    non-finite y are dropped and counted in `dropped` (pipeline warns
 *    `removed-missing`); groups left with zero finite values are skipped.
 *  - aes.weight is NOT supported (ggplot2 delegates weighted quantiles to
 *    the quantreg package); a mapped weight warns `weight-unsupported`.
 */
import type { CellValue } from "../table.js";
import { quantile7 } from "./numeric.js";

export interface BoxplotStatInput {
  /** The x column (each group's x value is constant; carried through). */
  x: readonly CellValue[];
  /** Numeric y view (NaN = missing). */
  y: Float64Array;
  /** Group id per input row. */
  groups: readonly number[];
  /** Whisker multiplier (default 1.5). */
  coef?: number;
  /** Discrete carried columns (constant per group), e.g. the fill field. */
  carried?: Readonly<Record<string, readonly CellValue[]>>;
}

export interface BoxplotStatResult {
  /** One row per group: the group's x value. */
  x: CellValue[];
  ymin: Float64Array;
  lower: Float64Array;
  middle: Float64Array;
  upper: Float64Array;
  ymax: Float64Array;
  groups: number[];
  carried: Record<string, CellValue[]>;
  /** Outlier points (one row each), indexed back to their box row. */
  outliers: { x: CellValue; y: number; boxRow: number }[];
  /** Input rows dropped (missing / non-finite y). */
  dropped: number;
}

export function statBoxplot(input: BoxplotStatInput): BoxplotStatResult {
  const { x, y, groups } = input;
  const coef = input.coef ?? 1.5;
  const carriedNames = Object.keys(input.carried ?? {});

  const groupOrder: number[] = [];
  const groupRows = new Map<number, number[]>();
  let dropped = 0;
  for (let i = 0; i < y.length; i++) {
    if (!Number.isFinite(y[i]!)) {
      dropped++;
      continue;
    }
    const g = groups[i]!;
    let rows = groupRows.get(g);
    if (rows === undefined) {
      rows = [];
      groupRows.set(g, rows);
      groupOrder.push(g);
    }
    rows.push(i);
  }

  const outX: CellValue[] = [];
  const ymin: number[] = [];
  const lower: number[] = [];
  const middle: number[] = [];
  const upper: number[] = [];
  const ymax: number[] = [];
  const outGroups: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];
  const outliers: { x: CellValue; y: number; boxRow: number }[] = [];

  for (const g of groupOrder) {
    const rows = groupRows.get(g)!;
    const sorted = new Float64Array(rows.length);
    for (let j = 0; j < rows.length; j++) sorted[j] = y[rows[j]!]!;
    sorted.sort();

    const q1 = quantile7(sorted, 0.25);
    const q2 = quantile7(sorted, 0.5);
    const q3 = quantile7(sorted, 0.75);
    const iqr = q3 - q1;
    const loFence = q1 - coef * iqr;
    const hiFence = q3 + coef * iqr;

    let lo = sorted[0]!;
    let hi = sorted.at(-1)!;
    const boxRow = outX.length;
    const xValue = x[rows[0]!]!;
    let hasOutliers = false;
    for (const row of rows) {
      const v = y[row]!;
      if (v < loFence || v > hiFence) {
        hasOutliers = true;
        outliers.push({ x: x[row]!, y: v, boxRow });
      }
    }
    if (hasOutliers) {
      // ggplot2: whisker ends = range of the hinges and non-outlier data.
      lo = Math.min(q1, q2, q3);
      hi = Math.max(q1, q2, q3);
      for (const row of rows) {
        const v = y[row]!;
        if (v < loFence || v > hiFence) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }

    outX.push(xValue);
    ymin.push(lo);
    lower.push(q1);
    middle.push(q2);
    upper.push(q3);
    ymax.push(hi);
    outGroups.push(g);
    for (const name of carriedNames) {
      carried[name]!.push(input.carried![name]![rows[0]!]!);
    }
  }

  return {
    x: outX,
    ymin: Float64Array.from(ymin),
    lower: Float64Array.from(lower),
    middle: Float64Array.from(middle),
    upper: Float64Array.from(upper),
    ymax: Float64Array.from(ymax),
    groups: outGroups,
    carried,
    outliers,
    dropped,
  };
}
