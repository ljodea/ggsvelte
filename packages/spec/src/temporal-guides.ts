import Type, { type Static, type TLiteral } from "typebox";

import {
  temporalImplementation,
  type TemporalDisambiguation,
  type TemporalKind,
} from "./temporal.js";

export const TEMPORAL_INTERVAL_UNITS = [
  "millisecond",
  "second",
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year",
] as const;
export type TemporalIntervalUnit = (typeof TEMPORAL_INTERVAL_UNITS)[number];

export const TEMPORAL_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type TemporalWeekStart = (typeof TEMPORAL_WEEKDAYS)[number];

const WEEKDAY_SCHEMAS = TEMPORAL_WEEKDAYS.map((weekday) => Type.Literal(weekday)) as unknown as [
  TLiteral<TemporalWeekStart>,
  ...TLiteral<TemporalWeekStart>[],
];

const TEMPORAL_INTERVAL_STEP_PATTERN = "(?:[1-9][0-9]{0,5}|1000000)";

export const TemporalIntervalSpecSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: `^[ ]*${TEMPORAL_INTERVAL_STEP_PATTERN}[ ]+(?:millisecond|second|minute|hour|day|week|month|quarter|year)s?[ ]*$`,
  description:
    'A positive integer calendar interval such as "2 weeks", "3 months", or "10 years". Canonical units are millisecond, second, minute, hour, day, week, month, quarter, and year.',
});
export type TemporalIntervalSpec = Static<typeof TemporalIntervalSpecSchema>;

export const TemporalWeekStartSchema = Type.Union(WEEKDAY_SCHEMAS, {
  description: 'Week boundary used by temporal interval breaks. Default "monday".',
});

export interface TemporalInterval {
  unit: TemporalIntervalUnit;
  step: number;
  key: string;
}

export const MAX_TEMPORAL_CANDIDATES = 128;
export const MAX_TEMPORAL_MAJOR_TICKS = 64;
export const MAX_TEMPORAL_MINOR_TICKS = 256;
export const MIN_TEMPORAL_LABEL_GAP_PX = 6;

export class TemporalIntervalError extends Error {
  readonly value: string;

  constructor(value: string, reason: string) {
    super(`Invalid temporal interval ${JSON.stringify(value)}: ${reason}.`);
    this.name = "TemporalIntervalError";
    this.value = value;
  }
}

const INTERVAL_RE = new RegExp(
  `^(${TEMPORAL_INTERVAL_STEP_PATTERN}) +(millisecond|second|minute|hour|day|week|month|quarter|year)(s?)$`,
);

export function parseTemporalInterval(value: string): TemporalInterval;
export function parseTemporalInterval(value: unknown): TemporalInterval {
  if (typeof value !== "string" || value.length > 128) {
    throw new TemporalIntervalError(String(value), "expected a string of at most 128 characters");
  }
  const match = INTERVAL_RE.exec(value.replaceAll(/^ +| +$/g, ""));
  if (match === null) {
    throw new TemporalIntervalError(
      value,
      'expected "<positive integer> <unit>" using a canonical calendar unit',
    );
  }
  const step = Number(match[1]);
  if (!Number.isSafeInteger(step) || step < 1 || step > 1_000_000) {
    throw new TemporalIntervalError(value, "step must be an integer from 1 through 1,000,000");
  }
  const unit = match[2] as TemporalIntervalUnit;
  return { unit, step, key: `${step} ${unit}${step === 1 ? "" : "s"}` };
}

export const TEMPORAL_LABEL_TOKENS = [
  "Y",
  "y",
  "m",
  "b",
  "B",
  "d",
  "e",
  "a",
  "A",
  "H",
  "I",
  "M",
  "S",
  "L",
  "p",
  "q",
  "z",
  "Z",
  "%",
] as const;
const LABEL_TOKEN_SET = new Set<string>(TEMPORAL_LABEL_TOKENS);

export function temporalLabelConfigurationError(pattern: string): string | null {
  if (pattern.length === 0 || pattern.length > 128) {
    return "dateLabels must contain 1 through 128 characters";
  }
  for (let index = 0; index < pattern.length; index++) {
    if (pattern[index] !== "%") continue;
    const token = pattern[++index];
    if (token === undefined || !LABEL_TOKEN_SET.has(token)) {
      return `unsupported dateLabels token %${token ?? ""}`;
    }
  }
  return null;
}

export function temporalLocaleConfigurationError(locale: string): string | null {
  if (locale.length === 0 || locale.length > 128) {
    return "locale must contain 1 through 128 characters";
  }
  try {
    const canonical = Intl.getCanonicalLocales(locale);
    if (canonical.length !== 1) return `invalid or unsupported locale ${JSON.stringify(locale)}`;
    const supported = Intl.DateTimeFormat.supportedLocalesOf(canonical, {
      localeMatcher: "lookup",
    });
    if (supported.length !== 1) {
      return `invalid or unsupported locale ${JSON.stringify(locale)}`;
    }
    new Intl.DateTimeFormat(canonical[0], { timeZone: "UTC", year: "numeric" }).format(0);
    return null;
  } catch {
    return `invalid or unsupported locale ${JSON.stringify(locale)}`;
  }
}

interface TemporalTickOptions {
  kind: TemporalKind;
  timezone?: string;
  weekStart?: TemporalWeekStart;
  disambiguation?: TemporalDisambiguation;
  maxTicks?: number;
}

const FIXED_UNIT_MS: Readonly<Partial<Record<TemporalIntervalUnit, number>>> = {
  millisecond: 1,
  second: 1_000,
  minute: 60_000,
};
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const WEEKDAY_NUMBER: Readonly<Record<TemporalWeekStart, number>> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

function fixedIntervalTicks(
  min: number,
  max: number,
  intervalMs: number,
  limit: number,
  key: string,
  offsetMs = 0,
): number[] {
  const first = Math.ceil((min - offsetMs) / intervalMs) * intervalMs + offsetMs;
  const result: number[] = [];
  for (let value = first; value <= max; value += intervalMs) {
    if (result.length >= limit) {
      throw new TemporalIntervalError(key, `tick count exceeds the ${limit}-tick limit`);
    }
    result.push(value);
    if (!Number.isSafeInteger(value + intervalMs) && value + intervalMs <= max) {
      throw new TemporalIntervalError(key, "tick progression exceeds safe epoch arithmetic");
    }
  }
  return result;
}

function utcEpoch(year: number, monthIndex: number, day = 1): number {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, monthIndex, day);
  return date.getTime();
}

function utcCalendarTicks(
  min: number,
  max: number,
  interval: TemporalInterval,
  weekStart: number,
  limit: number,
): number[] {
  if (interval.unit === "hour") {
    return fixedIntervalTicks(min, max, HOUR_MS * interval.step, limit, interval.key);
  }
  if (interval.unit === "day") {
    return fixedIntervalTicks(min, max, DAY_MS * interval.step, limit, interval.key);
  }
  if (interval.unit === "week") {
    // Epoch day zero was Thursday (Temporal day 4). Align to the requested weekday.
    const offsetDays = (weekStart - 4 + 7) % 7;
    return fixedIntervalTicks(
      min,
      max,
      DAY_MS * 7 * interval.step,
      limit,
      interval.key,
      offsetDays * DAY_MS,
    );
  }

  const start = new Date(min);
  let cursor: number;
  let add: (value: number) => number;
  if (interval.unit === "month" || interval.unit === "quarter") {
    const stepMonths = interval.step * (interval.unit === "quarter" ? 3 : 1);
    const absoluteMonth = start.getUTCFullYear() * 12 + start.getUTCMonth();
    let aligned = Math.floor(absoluteMonth / stepMonths) * stepMonths;
    cursor = utcEpoch(Math.floor(aligned / 12), aligned % 12);
    if (cursor < min) aligned += stepMonths;
    cursor = utcEpoch(Math.floor(aligned / 12), aligned % 12);
    add = (value) => {
      const date = new Date(value);
      const next = date.getUTCFullYear() * 12 + date.getUTCMonth() + stepMonths;
      return utcEpoch(Math.floor(next / 12), next % 12);
    };
  } else {
    let year = Math.floor(start.getUTCFullYear() / interval.step) * interval.step;
    cursor = utcEpoch(year, 0);
    if (cursor < min) year += interval.step;
    cursor = utcEpoch(year, 0);
    add = (value) => utcEpoch(new Date(value).getUTCFullYear() + interval.step, 0);
  }

  const result: number[] = [];
  while (cursor <= max) {
    if (result.length >= limit) {
      throw new TemporalIntervalError(interval.key, `tick count exceeds the ${limit}-tick limit`);
    }
    result.push(cursor);
    cursor = add(cursor);
  }
  return result;
}

/**
 * Generate bounded, calendar-aligned epoch-millisecond ticks for one explicit
 * temporal interval. Date-kind ticks always use UTC civil boundaries.
 */
export function temporalIntervalTicks(
  min: number,
  max: number,
  intervalInput: string | TemporalInterval,
  options: TemporalTickOptions,
): number[] {
  const interval =
    typeof intervalInput === "string" ? parseTemporalInterval(intervalInput) : intervalInput;
  const limit = options.maxTicks ?? MAX_TEMPORAL_MAJOR_TICKS;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min || limit < 1) return [];

  const fixedMs = FIXED_UNIT_MS[interval.unit];
  if (fixedMs !== undefined) {
    return fixedIntervalTicks(min, max, fixedMs * interval.step, limit, interval.key);
  }

  const timezone = options.kind === "date" ? "UTC" : (options.timezone ?? "UTC");
  const weekStart = WEEKDAY_NUMBER[options.weekStart ?? "monday"];
  if (timezone === "UTC" || timezone === "Etc/UTC" || timezone === "Z") {
    return utcCalendarTicks(min, max, interval, weekStart, limit);
  }

  const Temporal = temporalImplementation();
  const current = Temporal.Instant.fromEpochMilliseconds(min).toZonedDateTimeISO(timezone);
  const parts = {
    year: current.year,
    month: current.month,
    day: current.day,
    hour: current.hour,
    minute: current.minute,
    second: current.second,
    millisecond: current.millisecond,
  };

  let plain;
  switch (interval.unit) {
    case "hour": {
      const hour = Math.floor(parts.hour / interval.step) * interval.step;
      plain = Temporal.PlainDateTime.from({ ...parts, hour, minute: 0, second: 0, millisecond: 0 });
      break;
    }
    case "day":
      plain = Temporal.PlainDateTime.from({
        ...parts,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      break;
    case "week": {
      const daysBack = (current.dayOfWeek - weekStart + 7) % 7;
      plain = Temporal.PlainDateTime.from({
        ...parts,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      }).subtract({ days: daysBack });
      break;
    }
    case "month":
    case "quarter": {
      const stepMonths = interval.step * (interval.unit === "quarter" ? 3 : 1);
      const absoluteMonth = parts.year * 12 + parts.month - 1;
      const alignedMonth = Math.floor(absoluteMonth / stepMonths) * stepMonths;
      const monthIndex = ((alignedMonth % 12) + 12) % 12;
      plain = Temporal.PlainDateTime.from({
        ...parts,
        year: Math.floor(alignedMonth / 12),
        month: monthIndex + 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      break;
    }
    case "year": {
      const year = Math.floor(parts.year / interval.step) * interval.step;
      plain = Temporal.PlainDateTime.from({
        ...parts,
        year,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      break;
    }
    default:
      return [];
  }

  // Generated civil boundaries are synthetic, not parsed source values. Temporal's
  // compatible policy keeps them monotonic through gaps/folds; source parsing has
  // already applied the author's configured disambiguation contract.
  let tick = plain.toZonedDateTime(timezone, { disambiguation: "compatible" });
  if (tick.epochMilliseconds < min) {
    tick = addTemporalInterval(tick, interval);
  }

  const result: number[] = [];
  let stalled = 0;
  while (tick.epochMilliseconds <= max) {
    const epoch = tick.epochMilliseconds;
    if (epoch >= min && result.at(-1) !== epoch) {
      if (result.length >= limit) {
        throw new TemporalIntervalError(interval.key, `tick count exceeds the ${limit}-tick limit`);
      }
      result.push(epoch);
    }
    const next = addTemporalInterval(tick, interval);
    if (next.epochMilliseconds <= epoch) {
      stalled += 1;
      if (stalled >= 2) {
        throw new TemporalIntervalError(interval.key, "calendar progression did not advance");
      }
    } else {
      stalled = 0;
    }
    tick = next;
  }
  return result;
}

function addTemporalInterval(
  value: ReturnType<
    ReturnType<typeof temporalImplementation>["Instant"]["fromEpochMilliseconds"]
  >["toZonedDateTimeISO"] extends (...args: never[]) => infer Z
    ? Z
    : never,
  interval: TemporalInterval,
) {
  switch (interval.unit) {
    case "hour":
      return value.add({ hours: interval.step });
    case "day":
      return value.add({ days: interval.step });
    case "week":
      return value.add({ weeks: interval.step });
    case "month":
      return value.add({ months: interval.step });
    case "quarter":
      return value.add({ months: interval.step * 3 });
    case "year":
      return value.add({ years: interval.step });
    default:
      return value;
  }
}
