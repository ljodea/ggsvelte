/**
 * The density stat (gaussian KDE; R-fixture-tested against stats::density).
 *
 * Stat output contract (plan: "Stat output contracts"):
 *  - required inputs: a CONTINUOUS x channel. y must NOT be mapped to data
 *    (validate() enforces `computed-y-mapped`).
 *  - generated columns: `density` (the KDE), `count` (density × group row
 *    count — ggplot2's count scaling), `scaled` and `ndensity` (density /
 *    max density per group). y defaults to `{ stat: "density" }`.
 *    `x` becomes the positional output (the evaluation grid).
 *  - grouping behavior: bandwidth, grid, and normalization are all PER
 *    GROUP (each group gets its own n-point grid over its own range).
 *  - missing-value policy (ggplot2 na.rm semantics): rows with missing /
 *    non-finite x are dropped and counted in `dropped` (pipeline warns
 *    `removed-missing`); groups with fewer than 2 finite points are dropped
 *    entirely (`droppedGroups`; pipeline warns `density-group-dropped`,
 *    mirroring ggplot2's "Groups with fewer than two data points have been
 *    dropped"). Missing weights count as 0.
 *  - algorithm: bandwidth = adjust × (params.bw ?? bw.nrd0(x)) with R's
 *    bw.nrd0 = 0.9 × min(sd, IQR/1.34) × n^(-1/5); grid = n (default 512)
 *    equally spaced points over [min − cut·bw, max + cut·bw] (cut default
 *    3 — R's density() defaults). The density is evaluated by DIRECT kernel
 *    summation (exact), where R uses a binned FFT approximation — the
 *    R-fixture tolerance quantifies that gap (decision 0010). DIVERGENCE
 *    from ggplot2: ggplot2 evaluates on the scale range (curves cut off at
 *    the data extremes); ggsvelte keeps R's cut·bw tails so curves fall to
 *    ~0 (decision 0010).
 *  - weights (aes.weight): normalized to sum 1 within each group before
 *    estimation (R's requirement); `count` still scales by the unweighted
 *    row count, matching ggplot2.
 */
import type { CellValue } from "../table.js";
import { quantile7, sampleSD } from "./numeric.js";

interface DensityParamsInput {
  bw?: number | undefined;
  adjust?: number | undefined;
  n?: number | undefined;
  cut?: number | undefined;
}

export interface DensityStatInput {
  /** Numeric x view (NaN = missing). */
  x: Float64Array;
  /** Group id per input row. */
  groups: readonly number[];
  /** Optional weights (aes.weight). */
  weights?: Float64Array | null;
  /** Discrete carried columns (constant per group), e.g. the fill field. */
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: DensityParamsInput;
}

export interface DensityStatResult {
  /** Grid x per output row (n points per surviving group). */
  x: Float64Array;
  density: Float64Array;
  count: Float64Array;
  scaled: Float64Array;
  ndensity: Float64Array;
  groups: number[];
  carried: Record<string, CellValue[]>;
  /** Input rows dropped (missing / non-finite x). */
  dropped: number;
  /** Groups dropped for having fewer than two finite points. */
  droppedGroups: number;
}

/** R's bw.nrd0 (x must have >= 2 values). */
export function bwNRD0(sorted: Float64Array): number {
  const hi = sampleSD(sorted);
  const iqr = quantile7(sorted, 0.75) - quantile7(sorted, 0.25);
  let lo = Math.min(hi, iqr / 1.34);
  if (lo === 0) {
    if (hi === 0) {
      lo = Math.abs(sorted[0]!) === 0 ? 1 : Math.abs(sorted[0]!);
    } else {
      lo = hi;
    }
  }
  return 0.9 * lo * Math.pow(sorted.length, -0.2);
}

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

export function statDensity(input: DensityStatInput): DensityStatResult {
  const { x, groups, weights } = input;
  const params = input.params ?? {};
  const gridN = params.n ?? 512;
  const cut = params.cut ?? 3;
  const adjust = params.adjust ?? 1;
  const carriedNames = Object.keys(input.carried ?? {});

  // Partition finite rows per group (first-seen group order).
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
  const outDensity: number[] = [];
  const outCount: number[] = [];
  const outScaled: number[] = [];
  const outGroups: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];
  let droppedGroups = 0;

  for (const g of groupOrder) {
    const rows = groupRows.get(g)!;
    if (rows.length < 2) {
      droppedGroups++;
      continue;
    }
    const nx = rows.length;
    const values = new Float64Array(nx);
    for (let j = 0; j < nx; j++) values[j] = x[rows[j]!]!;
    // Normalized weights (sum 1 within the group; missing weights count 0).
    let w: Float64Array | null = null;
    if (weights !== null && weights !== undefined) {
      w = new Float64Array(nx);
      let sum = 0;
      for (let j = 0; j < nx; j++) {
        const wv = weights[rows[j]!]!;
        w[j] = Number.isFinite(wv) ? wv : 0;
        sum += w[j]!;
      }
      if (sum > 0) {
        for (let j = 0; j < nx; j++) w[j] = w[j]! / sum;
      } else {
        w = null;
      }
    }
    // Sort values (weights follow) so each grid point only visits the
    // ±8·bw window — the gaussian kernel is < 1.3e-14 beyond it, so the
    // cut is exact to double precision (unlike R's FFT binning).
    const order = Array.from({ length: nx }, (_, j) => j).toSorted(
      (a, b) => values[a]! - values[b]!,
    );
    const sorted = new Float64Array(nx);
    const sortedW = w === null ? null : new Float64Array(nx);
    for (let j = 0; j < nx; j++) {
      sorted[j] = values[order[j]!]!;
      if (sortedW !== null) sortedW[j] = w![order[j]!]!;
    }
    const bw = adjust * (params.bw ?? bwNRD0(sorted));
    const from = sorted[0]! - cut * bw;
    const to = sorted[nx - 1]! + cut * bw;
    const step = gridN === 1 ? 0 : (to - from) / (gridN - 1);
    const window = 8 * bw;

    let maxDensity = 0;
    const base = outX.length;
    let lo = 0;
    for (let k = 0; k < gridN; k++) {
      const x0 = from + k * step;
      while (lo < nx && sorted[lo]! < x0 - window) lo++;
      let d = 0;
      for (let j = lo; j < nx; j++) {
        const v = sorted[j]!;
        if (v > x0 + window) break;
        const z = (x0 - v) / bw;
        const kern = (INV_SQRT_2PI * Math.exp(-0.5 * z * z)) / bw;
        d += (sortedW === null ? 1 / nx : sortedW[j]!) * kern;
      }
      if (d > maxDensity) maxDensity = d;
      outX.push(x0);
      outDensity.push(d);
      outCount.push(d * nx);
      outGroups.push(g);
      for (const name of carriedNames) {
        carried[name]!.push(input.carried![name]![rows[0]!]!);
      }
    }
    for (let k = 0; k < gridN; k++) {
      outScaled.push(maxDensity > 0 ? outDensity[base + k]! / maxDensity : 0);
    }
  }

  return {
    x: Float64Array.from(outX),
    density: Float64Array.from(outDensity),
    count: Float64Array.from(outCount),
    scaled: Float64Array.from(outScaled),
    ndensity: Float64Array.from(outScaled),
    groups: outGroups,
    carried,
    dropped,
    droppedGroups,
  };
}
