/**
 * Calendar-aligned temporal tick generation for portable interval strings.
 * Interval parse/schemas: temporal-interval.ts. Facade: temporal-guides.ts.
 */

import {
  temporalImplementation,
  type TemporalDisambiguation,
  type TemporalKind,
} from "./temporal-parse.js";
import {
  MAX_TEMPORAL_MAJOR_TICKS,
  parseTemporalInterval,
  TemporalIntervalError,
  type TemporalInterval,
  type TemporalIntervalUnit,
  type TemporalWeekStart,
} from "./temporal-interval.js";

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

  const absoluteCivilDay = Math.floor(utcEpoch(parts.year, parts.month - 1, parts.day) / DAY_MS);
  const plainAtCivilDay = (day: number) => {
    const date = new Date(day * DAY_MS);
    return Temporal.PlainDateTime.from({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  };

  let plain;
  switch (interval.unit) {
    case "hour": {
      const hour = Math.floor(parts.hour / interval.step) * interval.step;
      plain = Temporal.PlainDateTime.from({ ...parts, hour, minute: 0, second: 0, millisecond: 0 });
      break;
    }
    case "day": {
      const alignedDay = Math.floor(absoluteCivilDay / interval.step) * interval.step;
      plain = plainAtCivilDay(alignedDay);
      break;
    }
    case "week": {
      // Epoch day zero was Thursday (Temporal day 4). Match the UTC path's
      // weekday offset and multi-week phase in local civil-date space.
      const offsetDays = (weekStart - 4 + 7) % 7;
      const stepDays = interval.step * 7;
      const alignedDay =
        Math.floor((absoluteCivilDay - offsetDays) / stepDays) * stepDays + offsetDays;
      plain = plainAtCivilDay(alignedDay);
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

  const advancePlain = (value: typeof plain): typeof plain => {
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
  };
  const project = (value: typeof plain) =>
    value.toZonedDateTime(timezone, { disambiguation: "compatible" });

  // Generated civil boundaries are synthetic, not parsed source values. Advance
  // the aligned civil cursor before each projection so a gap adjustment (for
  // example 02:00 -> 03:00) cannot shift every later multi-hour boundary.
  // Source parsing has already applied the author's disambiguation contract.
  let cursor = plain;
  let tick = project(cursor);
  if (tick.epochMilliseconds < min) {
    cursor = advancePlain(cursor);
    tick = project(cursor);
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
    const nextCursor = advancePlain(cursor);
    const next = project(nextCursor);
    if (next.epochMilliseconds <= epoch) {
      stalled += 1;
      if (stalled >= 2) {
        throw new TemporalIntervalError(interval.key, "calendar progression did not advance");
      }
    } else {
      stalled = 0;
    }
    cursor = nextCursor;
    tick = next;
  }
  return result;
}
