/**
 * Time-scale tick generation (hand-rolled, d3-time-style semantics; decision
 * recorded in docs/decisions/0008 — no d3-time / d3-time-format dependency).
 *
 * Ticks are generated over epoch milliseconds in UTC: a human interval
 * (second/minute/hour/day/week/month/year multiples) is chosen so the tick
 * count lands near the request, and ticks align to calendar boundaries
 * (midnight, month starts, ISO Monday weeks, year starts). Multi-scale
 * default labels mirror d3-scale's behavior: each tick is labeled at the
 * finest calendar unit it starts (year ticks "2026", month ticks "Mar",
 * day ticks "Mar 05", time ticks "14:30" / ":45s").
 */
import { tickStep } from "./ticks.js";
import { formatTime } from "./format.js";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
/** Average month/year lengths — used only to CHOOSE the interval. */
const MONTH = 30.44 * DAY;
const YEAR = 365.25 * DAY;

type IntervalUnit = "ms" | "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

interface TickInterval {
  unit: IntervalUnit;
  step: number;
  /** Approximate length in ms (for choosing the interval). */
  approx: number;
}

const INTERVALS: TickInterval[] = [
  { unit: "second", step: 1, approx: SECOND },
  { unit: "second", step: 5, approx: 5 * SECOND },
  { unit: "second", step: 15, approx: 15 * SECOND },
  { unit: "second", step: 30, approx: 30 * SECOND },
  { unit: "minute", step: 1, approx: MINUTE },
  { unit: "minute", step: 5, approx: 5 * MINUTE },
  { unit: "minute", step: 15, approx: 15 * MINUTE },
  { unit: "minute", step: 30, approx: 30 * MINUTE },
  { unit: "hour", step: 1, approx: HOUR },
  { unit: "hour", step: 3, approx: 3 * HOUR },
  { unit: "hour", step: 6, approx: 6 * HOUR },
  { unit: "hour", step: 12, approx: 12 * HOUR },
  { unit: "day", step: 1, approx: DAY },
  { unit: "day", step: 2, approx: 2 * DAY },
  { unit: "week", step: 1, approx: WEEK },
  { unit: "month", step: 1, approx: MONTH },
  { unit: "month", step: 3, approx: 3 * MONTH },
  { unit: "year", step: 1, approx: YEAR },
];

/** Fixed-length (non-calendar) interval ticks aligned to epoch multiples. */
function fixedTicks(min: number, max: number, intervalMs: number): number[] {
  const start = Math.ceil(min / intervalMs);
  const stop = Math.floor(max / intervalMs);
  const out: number[] = [];
  for (let i = start; i <= stop; i++) out.push(i * intervalMs);
  return out;
}

/** ISO-Monday-aligned week ticks. */
function weekTicks(min: number, max: number): number[] {
  // Epoch day 0 (1970-01-01) was a Thursday; Mondays satisfy day % 7 === 4.
  const firstDay = Math.ceil((min / DAY - 4) / 7) * 7 + 4;
  const out: number[] = [];
  for (let day = firstDay; day * DAY <= max; day += 7) {
    const ms = day * DAY;
    if (ms >= min) out.push(ms);
  }
  return out;
}

function monthTicks(min: number, max: number, step: number): number[] {
  const start = new Date(min);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  // Advance to the first month-start >= min that is aligned to `step`.
  if (Date.UTC(year, month, 1) < min) month += 1;
  month += (step - (month % step)) % step;
  const out: number[] = [];
  for (;;) {
    const ms = Date.UTC(year + Math.floor(month / 12), month % 12, 1);
    if (ms > max) break;
    if (ms >= min) out.push(ms);
    month += step;
  }
  return out;
}

function yearTicks(min: number, max: number, step: number): number[] {
  const firstYear = new Date(min).getUTCFullYear();
  let year = Math.ceil(firstYear / step) * step;
  if (Date.UTC(year, 0, 1) < min) year += step;
  const out: number[] = [];
  for (;;) {
    const ms = Date.UTC(year, 0, 1);
    if (ms > max) break;
    out.push(ms);
    year += step;
  }
  return out;
}

export interface TimeTicksResult {
  values: number[];
  unit: IntervalUnit;
  step: number;
}

/** Calendar-aligned time ticks over [min, max] epoch ms, ~count requested. */
export function timeTicks(min: number, max: number, count: number): TimeTicksResult {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min || count <= 0) {
    return { values: [], unit: "ms", step: 1 };
  }
  if (min === max) return { values: [min], unit: "ms", step: 1 };
  const target = (max - min) / count;

  // Beyond single years: multi-year steps via the 1/2/5 rule on year numbers.
  if (target > YEAR) {
    const startYear = new Date(min).getUTCFullYear();
    const stopYear = new Date(max).getUTCFullYear();
    const step = Math.max(1, Math.round(tickStep(startYear, stopYear, count)));
    return { values: yearTicks(min, max, step), unit: "year", step };
  }
  // Below one second: plain millisecond ticks via the linear 1/2/5 rule.
  if (target < SECOND) {
    const step = Math.max(1, tickStep(min, max, count));
    return { values: fixedTicks(min, max, step), unit: "ms", step };
  }

  let chosen = INTERVALS.at(-1)!;
  for (let i = 0; i < INTERVALS.length; i++) {
    const current = INTERVALS[i]!;
    if (current.approx >= target) {
      // Pick the closer of this interval and the previous one (log distance).
      const previous = INTERVALS[i - 1];
      chosen =
        previous !== undefined && target / previous.approx < current.approx / target
          ? previous
          : current;
      break;
    }
  }

  switch (chosen.unit) {
    case "week":
      return { values: weekTicks(min, max), unit: "week", step: 1 };
    case "month":
      return { values: monthTicks(min, max, chosen.step), unit: "month", step: chosen.step };
    case "year":
      return { values: yearTicks(min, max, chosen.step), unit: "year", step: chosen.step };
    default:
      // For fixed-length units, `approx` IS the exact interval (step included).
      return {
        values: fixedTicks(min, max, chosen.approx),
        unit: chosen.unit,
        step: chosen.step,
      };
  }
}

/**
 * Multi-scale default label for one time tick: the finest calendar unit the
 * tick starts determines its format (d3-scale-style).
 */
export function defaultTimeTickFormat(ms: number): string {
  const d = new Date(ms);
  if (d.getUTCMilliseconds() !== 0) return formatTime(ms, ".%L");
  if (d.getUTCSeconds() !== 0) return formatTime(ms, ":%S");
  if (d.getUTCMinutes() !== 0 || d.getUTCHours() !== 0) return formatTime(ms, "%H:%M");
  if (d.getUTCDate() !== 1) return formatTime(ms, "%b %d");
  if (d.getUTCMonth() !== 0) return formatTime(ms, "%b");
  return formatTime(ms, "%Y");
}
