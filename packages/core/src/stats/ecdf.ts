/**
 * The ecdf stat (ggplot2's stat_ecdf; R-fixture-tested via layer_data).
 *
 * Stat output contract:
 *  - required inputs: continuous x. y must NOT map data (validate/bind enforce
 *    computed-y when stat is ecdf).
 *  - generated columns: `ecdf` — cumulative proportion F̂(x) = (# ≤ x) / n
 *    per group. y defaults to `{ stat: "ecdf" }`.
 *  - grouping: one ECDF per group (first-seen group order).
 *  - missing-value policy: non-finite x dropped (`dropped`; pipeline warns
 *    removed-missing). Empty groups after drop are skipped.
 *  - params.pad (default true): finite-clamp divergence from ggplot2 — ggplot2
 *    pads with x = ±Inf; we prepend (xmin, 0) so step-hv stairs start at zero.
 *    Trailing pad is omitted (F(xmax) is already 1).
 *  - params.n: when set, evaluate on n equally spaced x in [min, max] per group
 *    (after drop); otherwise one row per unique finite x (ascending).
 *  - weights: out of scope for v1.
 */
import type { CellValue } from "../table.js";

interface EcdfParamsInput {
  /** Prepend (xmin, 0). Default true. */
  pad?: boolean | undefined;
  /** Evaluation grid size; omit for unique data x. */
  n?: number | undefined;
}

export interface EcdfStatInput {
  x: Float64Array;
  groups: readonly number[];
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: EcdfParamsInput;
}

export interface EcdfStatResult {
  x: Float64Array;
  ecdf: Float64Array;
  groups: number[];
  carried: Record<string, CellValue[]>;
  dropped: number;
}

export function statEcdf(input: EcdfStatInput): EcdfStatResult {
  const { x, groups } = input;
  const params = input.params ?? {};
  const pad = params.pad !== false;
  const gridN = params.n;
  const carriedNames = Object.keys(input.carried ?? {});

  const groupOrder: number[] = [];
  const groupRows = new Map<number, number[]>();
  let dropped = 0;
  for (let i = 0; i < x.length; i++) {
    if (!Number.isFinite(x[i]!)) {
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

  const outX: number[] = [];
  const outEcdf: number[] = [];
  const outGroups: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];

  for (const g of groupOrder) {
    const rows = groupRows.get(g)!;
    if (rows.length === 0) continue;
    const values = new Float64Array(rows.length);
    for (let j = 0; j < rows.length; j++) values[j] = x[rows[j]!]!;
    values.sort();
    const nObs = values.length;
    const xmin = values[0]!;
    const xmax = values[nObs - 1]!;

    let evalX: number[];
    if (gridN !== undefined && Number.isFinite(gridN) && gridN >= 1) {
      const n = Math.floor(gridN);
      evalX = [];
      if (n === 1 || xmin === xmax) {
        evalX.push(xmin);
      } else {
        const step = (xmax - xmin) / (n - 1);
        for (let k = 0; k < n; k++) evalX.push(xmin + k * step);
      }
    } else {
      evalX = [];
      for (let j = 0; j < nObs; j++) {
        const v = values[j]!;
        if (evalX.length === 0 || evalX.at(-1)! !== v) evalX.push(v);
      }
    }

    const pushRow = (xv: number, yv: number) => {
      outX.push(xv);
      outEcdf.push(yv);
      outGroups.push(g);
      for (const name of carriedNames) {
        carried[name]!.push(input.carried![name]![rows[0]!]!);
      }
    };

    if (pad) pushRow(xmin, 0);

    let i = 0;
    for (const xv of evalX) {
      while (i < nObs && values[i]! <= xv) i++;
      pushRow(xv, i / nObs);
    }
  }

  return {
    x: Float64Array.from(outX),
    ecdf: Float64Array.from(outEcdf),
    groups: outGroups,
    carried,
    dropped,
  };
}
