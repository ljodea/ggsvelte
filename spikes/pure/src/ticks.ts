/**
 * M0a-3 spike — d3-style nice linear ticks + a default tick formatter.
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
  const ticks = new Array<number>(Math.max(0, n));
  for (let i = 0; i < n; i++) ticks[i] = (start + i) * step;
  return ticks;
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
    return v.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };
}
