/**
 * The function stat (ggplot2 stat_function clean-room).
 *
 * Evaluates a named portable function on an evenly spaced grid over a
 * continuous x domain. No JS closures in PortableSpec — only the registry.
 *
 * Stat output contract:
 *  - required inputs: a domain (params.xlim, or peer/own data extent)
 *  - generated columns: `y` (function values); positional `x` is the grid
 *  - y defaults to `{ stat: "y" }`
 *  - missing-value policy: domain missing → empty result + domainMissing flag
 *  - grouping: v1 single group (one path); multi-group deferred
 *
 * Registry (v1): identity, dnorm, pnorm, linear.
 */

export type FunctionRegistryName = "identity" | "dnorm" | "pnorm" | "linear";

export interface FunctionArgs {
  mean?: number;
  sd?: number;
  a?: number;
  b?: number;
}

export interface FunctionParamsInput {
  fun?: string;
  n?: number;
  xlim?: readonly [number, number] | number[];
  args?: FunctionArgs;
}

export interface FunctionStatInput {
  params?: FunctionParamsInput;
  /** Resolved evaluation domain when xlim is omitted (peer layers / data). */
  domain?: readonly [number, number] | null;
}

export interface FunctionStatResult {
  x: Float64Array;
  y: Float64Array;
  groups: number[];
  carried: Record<string, never>;
  domainMissing: boolean;
  /** True when params.fun is a non-empty name not in the portable registry. */
  funUnknown: boolean;
}

/** Standard normal PDF (mean, sd). */
export function dnorm(x: number, mean = 0, sd = 1): number {
  if (!(sd > 0) || !Number.isFinite(x) || !Number.isFinite(mean)) return NaN;
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/**
 * Standard normal CDF via erf approximation (Abramowitz & Stegun 7.1.26).
 * Absolute error under ~1.5e-7.
 */
export function pnorm(x: number, mean = 0, sd = 1): number {
  if (!(sd > 0) || !Number.isFinite(x) || !Number.isFinite(mean)) return NaN;
  const z = (x - mean) / (sd * Math.SQRT2);
  // erf(z)
  const sign = z < 0 ? -1 : 1;
  const ax = Math.abs(z);
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * erf);
}

export function resolveFunctionFn(
  name: string,
  args: FunctionArgs = {},
): ((x: number) => number) | null {
  const mean = args.mean ?? 0;
  const sd = args.sd ?? 1;
  const a = args.a ?? 0;
  const b = args.b ?? 1;
  switch (name) {
    case "identity":
      return (x) => x;
    case "dnorm":
      return (x) => dnorm(x, mean, sd);
    case "pnorm":
      return (x) => pnorm(x, mean, sd);
    case "linear":
      return (x) => a + b * x;
    default:
      return null;
  }
}

function resolveDomain(
  params: FunctionParamsInput | undefined,
  domain: readonly [number, number] | null | undefined,
): [number, number] | null {
  const xlim = params?.xlim;
  if (Array.isArray(xlim) && xlim.length >= 2) {
    const lo = Number(xlim[0]);
    const hi = Number(xlim[1]);
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo < hi) return [lo, hi];
  }
  if (domain !== undefined && domain !== null) {
    const lo = domain[0];
    const hi = domain[1];
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo < hi) return [lo, hi];
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo === hi) {
      // Degenerate single-point domain: expand by 1 unit like a tiny pad.
      return [lo - 0.5, hi + 0.5];
    }
  }
  return null;
}

/**
 * Evaluate the named function on an evenly spaced grid over the domain.
 */
export function statFunction(input: FunctionStatInput): FunctionStatResult {
  const params = input.params ?? {};
  const emptyArrays = {
    x: new Float64Array(0),
    y: new Float64Array(0),
    groups: [] as number[],
    carried: {} as Record<string, never>,
  };
  const funName = typeof params.fun === "string" ? params.fun : "";
  const fn = resolveFunctionFn(funName, params.args ?? {});
  const domain = resolveDomain(params, input.domain);
  if (fn === null) {
    // Keep domainMissing orthogonal to funUnknown so callers can emit the
    // right warning when an unrecognized name is supplied with a valid domain.
    return {
      ...emptyArrays,
      domainMissing: domain === null,
      funUnknown: funName.length > 0,
    };
  }
  if (domain === null) {
    return { ...emptyArrays, domainMissing: true, funUnknown: false };
  }

  const nRaw = params.n ?? 101;
  const n = Math.max(2, Math.min(10_000, Math.floor(nRaw)));
  const [lo, hi] = domain;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const groups: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const xi = lo + t * (hi - lo);
    x[i] = xi;
    y[i] = fn(xi);
    groups.push(0);
  }
  return { x, y, groups, carried: {}, domainMissing: false, funUnknown: false };
}
