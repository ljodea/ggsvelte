/**
 * d3-style nice linear ticks + a default tick formatter (graduated from
 * the M0a-3 spike, decision 0003; hand-rolled — no d3 dependency).
 * Standard extended Wilkinson-lite algorithm (same as d3-array's ticks):
 * steps are 1/2/5 x 10^k, chosen so the tick count is close to the request.
 */

const e10 = Math.sqrt(50);
const e5 = Math.sqrt(10);
const e2 = Math.sqrt(2);

/** Nice step size for [start, stop] aiming for ~count intervals. */
export function tickStep(start: number, stop: number, count: number): number {
  const span = Math.abs(stop - start);
  const step0 = span / Math.max(0, count);
  const step1 = 10 ** Math.floor(Math.log10(step0));
  const error = step0 / step1;
  let factor = 1;
  if (error >= e10) factor = 10;
  else if (error >= e5) factor = 5;
  else if (error >= e2) factor = 2;
  return step1 * factor * (stop < start ? -1 : 1);
}

/** Nice tick values covering [min, max] with roughly `count` ticks. */
export function linearTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || count <= 0) return [];
  if (min === max) return [min];
  const step = tickStep(min, max, count);
  if (step === 0 || !Number.isFinite(step)) return [min];
  const start = Math.ceil(min / step);
  const stop = Math.floor(max / step);
  const n = stop - start + 1;
  const ticks = Array.from<number>({ length: Math.max(0, n) });
  for (let i = 0; i < n; i++) ticks[i] = (start + i) * step;
  return ticks;
}

/**
 * Log-scale (base 10) tick values covering [min, max] with roughly `count`
 * ticks. Both bounds must be positive (the scale enforces this upstream).
 * Density-adaptive mantissas, d3-log-style: dense -> 1..9 per decade,
 * medium -> 1/2/5, sparse -> powers of ten only; when there are more decades
 * than requested ticks, exponents are thinned by the 1/2/5 rule.
 */
export function logTicks(min: number, max: number, count: number): number[] {
  if (!(min > 0) || !(max > 0) || !Number.isFinite(min) || !Number.isFinite(max) || count <= 0) {
    return [];
  }
  if (min === max) return [min];
  const i = Math.log10(min);
  const j = Math.log10(max);
  const decades = j - i;
  if (decades > count) {
    // Too many decades: powers of ten at 1/2/5-stepped integer exponents.
    const step = Math.max(1, Math.round(tickStep(i, j, count)));
    const out: number[] = [];
    for (let k = Math.ceil(i / step) * step; k <= j + 1e-12; k += step) out.push(10 ** k);
    return out;
  }
  const perDecade = count / Math.max(1, decades);
  const mantissas = perDecade >= 9 ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : perDecade >= 3 ? [1, 2, 5] : [1];
  const out: number[] = [];
  for (let k = Math.floor(i); k <= Math.ceil(j); k++) {
    for (const m of mantissas) {
      const v = m * 10 ** k;
      // Epsilon-tolerant bounds: 10**k arithmetic wobbles in the last bit.
      if (v >= min * (1 - 1e-12) && v <= max * (1 + 1e-12)) out.push(v);
    }
  }
  return out;
}

/** Default log-tick formatter: plain numbers, exponential beyond 1e±6. */
export function defaultLogTickFormat(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const abs = Math.abs(v);
  if (abs >= 1e6 || (abs > 0 && abs < 1e-4)) {
    return v.toExponential(0).replace("e+", "e");
  }
  const decimals = abs >= 1 ? 0 : Math.min(20, -Math.floor(Math.log10(abs)));
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Default numeric tick formatter: decimals derived from the step so labels
 * across one axis agree, thousands grouping for readability (this is what
 * makes huge-number labels wide — the fixture we care about), exponential
 * fallback beyond 1e18 where grouping stops being legible.
 */
export function defaultTickFormat(step: number): (v: number) => string {
  const decimals =
    !Number.isFinite(step) || step === 0
      ? 0
      : Math.max(0, Math.min(20, -Math.floor(Math.log10(Math.abs(step)))));
  return (v: number) => {
    if (!Number.isFinite(v)) return String(v);
    if (Math.abs(v) >= 1e18) return v.toExponential(2);
    return v.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };
}
