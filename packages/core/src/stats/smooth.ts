/**
 * The smooth stat (ggplot2's stat_smooth; R-fixture-tested).
 *
 * Stat output contract (plan: "Stat output contracts"):
 *  - required inputs: quantitative x and y channels (tier-2
 *    `channel-type-mismatch` enforces it).
 *  - generated columns, params.n (default 80) rows per group evaluated at
 *    equally spaced x over the group's x range: `y` (the fit), `ymin` /
 *    `ymax` (the confidence band when params.se, default level 0.95), `se`
 *    (the pointwise standard error). `x` becomes the positional output.
 *  - grouping behavior: one fit per group (e.g. per color series).
 *  - missing-value policy (ggplot2 na.rm semantics): rows with missing /
 *    non-finite x or y are dropped and counted in `dropped` (pipeline warns
 *    `removed-missing`); groups too small or degenerate to fit are dropped
 *    (`droppedGroups`; pipeline warns `smooth-group-dropped`).
 *  - methods:
 *      "lm"    — exact closed-form least squares. Band: ŷ ± qt((1+level)/2,
 *                n−2) · s·sqrt(1/n + (x0−x̄)²/Sxx) — matches R exactly
 *                (fixtures at 1e-8).
 *      "loess" — see stats/loess.ts (R parity target: surface="direct",
 *                statistics="exact"; tolerances vs ggplot2's default loess
 *                path documented in decision 0010).
 *    method omitted -> inferred: "loess" when the largest group has fewer
 *    than 1000 rows, else "lm" (advisory `smooth-method-inferred`;
 *    DIVERGENCE: ggplot2 escalates to mgcv::gam, which ggsvelte does not
 *    ship — lm is the honest large-n fallback, decision 0010).
 */
import type { CellValue } from "../table.js";
import { loessFit } from "./loess.js";
import { qt } from "./numeric.js";

interface SmoothParamsInput {
  method?: "lm" | "loess" | undefined;
  se?: boolean | undefined;
  level?: number | undefined;
  span?: number | undefined;
  degree?: 1 | 2 | undefined;
  n?: number | undefined;
}

export interface SmoothStatInput {
  /** Numeric x view (NaN = missing). */
  x: Float64Array;
  /** Numeric y view (NaN = missing). */
  y: Float64Array;
  /** Group id per input row. */
  groups: readonly number[];
  /** Discrete carried columns (constant per group), e.g. the color field. */
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: SmoothParamsInput;
}

export interface SmoothStatResult {
  /** Evaluation grid per output row (n points per surviving group). */
  x: Float64Array;
  y: Float64Array;
  /** Confidence band (NaN-filled when se is off or a group has no band). */
  ymin: Float64Array;
  ymax: Float64Array;
  se: Float64Array;
  /** True when the band was computed (params.se, default true). */
  hasBand: boolean;
  groups: number[];
  carried: Record<string, CellValue[]>;
  dropped: number;
  droppedGroups: number;
  methodUsed: "lm" | "loess";
  /** True when the method was inferred (advisory material). */
  methodInferred: boolean;
}

export function statSmooth(input: SmoothStatInput): SmoothStatResult {
  const { x, y, groups } = input;
  const params = input.params ?? {};
  const level = params.level ?? 0.95;
  const wantSE = params.se ?? true;
  const evalN = params.n ?? 80;
  const span = params.span ?? 0.75;
  const degree = params.degree ?? 2;
  const carriedNames = Object.keys(input.carried ?? {});

  // Partition finite pairs per group (first-seen group order).
  const groupOrder: number[] = [];
  const groupRows = new Map<number, number[]>();
  let dropped = 0;
  for (let i = 0; i < x.length; i++) {
    if (!Number.isFinite(x[i]!) || !Number.isFinite(y[i]!)) {
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

  let maxGroup = 0;
  for (const rows of groupRows.values()) maxGroup = Math.max(maxGroup, rows.length);
  const methodInferred = params.method === undefined;
  const method = params.method ?? (maxGroup < 1000 ? "loess" : "lm");

  const outX: number[] = [];
  const outY: number[] = [];
  const outYmin: number[] = [];
  const outYmax: number[] = [];
  const outSE: number[] = [];
  const outGroups: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];
  let droppedGroups = 0;

  for (const g of groupOrder) {
    const rows = groupRows.get(g)!;
    const nx = rows.length;
    const gx = new Float64Array(nx);
    const gy = new Float64Array(nx);
    let min = Infinity;
    let max = -Infinity;
    for (let j = 0; j < nx; j++) {
      gx[j] = x[rows[j]!]!;
      gy[j] = y[rows[j]!]!;
      if (gx[j]! < min) min = gx[j]!;
      if (gx[j]! > max) max = gx[j]!;
    }

    // Per-eval-point fit + se·norm, method-specific.
    let evaluate: ((x0: number) => { fit: number; seFit: number }) | null = null;
    let ciMult = NaN;

    if (method === "lm") {
      if (nx < 2 || min === max) {
        droppedGroups++;
        continue;
      }
      let sx = 0;
      let sy = 0;
      for (let j = 0; j < nx; j++) {
        sx += gx[j]!;
        sy += gy[j]!;
      }
      const xbar = sx / nx;
      const ybar = sy / nx;
      let sxx = 0;
      let sxy = 0;
      for (let j = 0; j < nx; j++) {
        const dx = gx[j]! - xbar;
        sxx += dx * dx;
        sxy += dx * (gy[j]! - ybar);
      }
      const slope = sxy / sxx;
      const intercept = ybar - slope * xbar;
      let rss = 0;
      for (let j = 0; j < nx; j++) {
        const e = gy[j]! - (intercept + slope * gx[j]!);
        rss += e * e;
      }
      const sigma = nx > 2 ? Math.sqrt(rss / (nx - 2)) : NaN;
      ciMult = qt((1 + level) / 2, nx - 2);
      evaluate = (x0: number) => ({
        fit: intercept + slope * x0,
        seFit: sigma * Math.sqrt(1 / nx + ((x0 - xbar) * (x0 - xbar)) / sxx),
      });
    } else {
      const model = loessFit(gx, gy, { span, degree, statistics: wantSE });
      if (model === null) {
        droppedGroups++;
        continue;
      }
      ciMult = wantSE ? qt((1 + level) / 2, model.df) : NaN;
      evaluate = (x0: number) => ({
        fit: model.predict(x0),
        seFit: wantSE ? model.sigma * model.seNorm(x0) : NaN,
      });
    }

    const step = evalN === 1 ? 0 : (max - min) / (evalN - 1);
    const bandOK = wantSE && Number.isFinite(ciMult);
    for (let k = 0; k < evalN; k++) {
      const x0 = min + k * step;
      const { fit, seFit } = evaluate(x0);
      outX.push(x0);
      outY.push(fit);
      if (bandOK && Number.isFinite(seFit)) {
        outYmin.push(fit - ciMult * seFit);
        outYmax.push(fit + ciMult * seFit);
        outSE.push(seFit);
      } else {
        outYmin.push(NaN);
        outYmax.push(NaN);
        outSE.push(NaN);
      }
      outGroups.push(g);
      for (const name of carriedNames) {
        carried[name]!.push(input.carried![name]![rows[0]!]!);
      }
    }
  }

  return {
    x: Float64Array.from(outX),
    y: Float64Array.from(outY),
    ymin: Float64Array.from(outYmin),
    ymax: Float64Array.from(outYmax),
    se: Float64Array.from(outSE),
    hasBand: wantSE,
    groups: outGroups,
    carried,
    dropped,
    droppedGroups,
    methodUsed: method,
    methodInferred,
  };
}
