/**
 * Strict `dateLabels` grammar and span-uniform temporal tick label sequences.
 */
import type { TemporalInterval, TemporalKind } from "@ggsvelte/spec";
import { temporalLabelConfigurationError } from "@ggsvelte/spec";

import { MONTHS_LONG, MONTHS_SHORT, pad2, pad3 } from "./format-time.js";

export interface TemporalLabelFormatOptions {
  kind: TemporalKind;
  locale?: string;
  timezone?: string;
}

interface TemporalDisplayParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  monthShort: string;
  monthLong: string;
  weekdayShort: string;
  weekdayLong: string;
  dayPeriod: string;
  zoneShort: string;
  offset: string;
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const MAX_TEMPORAL_INTL_CACHE_ENTRIES = 64;
const TEMPORAL_INTL_CACHE = new Map<string, Intl.DateTimeFormat>();

function cachedDateTimeFormat(
  locale: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = JSON.stringify([locale, timezone, options]);
  const cached = TEMPORAL_INTL_CACHE.get(key);
  if (cached !== undefined) {
    TEMPORAL_INTL_CACHE.delete(key);
    TEMPORAL_INTL_CACHE.set(key, cached);
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    ...options,
    calendar: "gregory",
    timeZone: timezone,
  });
  if (TEMPORAL_INTL_CACHE.size >= MAX_TEMPORAL_INTL_CACHE_ENTRIES) {
    const oldest = TEMPORAL_INTL_CACHE.keys().next().value;
    if (oldest !== undefined) TEMPORAL_INTL_CACHE.delete(oldest);
  }
  TEMPORAL_INTL_CACHE.set(key, formatter);
  return formatter;
}

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function displayParts(ms: number, options: TemporalLabelFormatOptions): TemporalDisplayParts {
  const locale = options.locale ?? "en-US";
  // date and time-of-day are wall-clock-less / fixed UTC; datetime may carry a zone.
  const configuredTimezone =
    options.kind === "date" || options.kind === "time" ? "UTC" : (options.timezone ?? "UTC");
  const timezone =
    configuredTimezone === "Z" || configuredTimezone === "Etc/UTC" ? "UTC" : configuredTimezone;
  const d = new Date(ms);
  if (locale === "en-US" && timezone === "UTC") {
    const hour = d.getUTCHours();
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour,
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      millisecond: d.getUTCMilliseconds(),
      monthShort: MONTHS_SHORT[d.getUTCMonth()]!,
      monthLong: MONTHS_LONG[d.getUTCMonth()]!,
      weekdayShort: WEEKDAYS_SHORT[d.getUTCDay()]!,
      weekdayLong: WEEKDAYS_LONG[d.getUTCDay()]!,
      dayPeriod: hour < 12 ? "AM" : "PM",
      zoneShort: "UTC",
      offset: "+0000",
    };
  }

  const numericParts = cachedDateTimeFormat(locale, timezone, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
    numberingSystem: "latn",
  }).formatToParts(ms);
  const monthShort = partValue(
    cachedDateTimeFormat(locale, timezone, { month: "short" }).formatToParts(ms),
    "month",
  );
  const monthLong = partValue(
    cachedDateTimeFormat(locale, timezone, { month: "long" }).formatToParts(ms),
    "month",
  );
  const weekdayShort = partValue(
    cachedDateTimeFormat(locale, timezone, { weekday: "short" }).formatToParts(ms),
    "weekday",
  );
  const weekdayLong = partValue(
    cachedDateTimeFormat(locale, timezone, { weekday: "long" }).formatToParts(ms),
    "weekday",
  );
  const dayPeriodParts = cachedDateTimeFormat(locale, timezone, {
    hour: "numeric",
    hourCycle: "h12",
  }).formatToParts(ms);
  const zoneShort = partValue(
    cachedDateTimeFormat("en-US", timezone, { timeZoneName: "short" }).formatToParts(ms),
    "timeZoneName",
  );
  const longOffset = partValue(
    cachedDateTimeFormat("en-US", timezone, { timeZoneName: "longOffset" }).formatToParts(ms),
    "timeZoneName",
  );
  // Intl longOffset may include seconds for historical zones (e.g. GMT+05:21:10).
  const offsetMatch = /^GMT([+-])(\d{2}):(\d{2})(?::\d{2})?$/.exec(longOffset);
  const offset =
    offsetMatch === null ? "+0000" : `${offsetMatch[1]}${offsetMatch[2]}${offsetMatch[3]}`;
  return {
    year: Number(partValue(numericParts, "year")),
    month: Number(partValue(numericParts, "month")),
    day: Number(partValue(numericParts, "day")),
    hour: Number(partValue(numericParts, "hour")),
    minute: Number(partValue(numericParts, "minute")),
    second: Number(partValue(numericParts, "second")),
    millisecond: d.getUTCMilliseconds(),
    monthShort,
    monthLong,
    weekdayShort,
    weekdayLong,
    dayPeriod: partValue(dayPeriodParts, "dayPeriod"),
    zoneShort,
    offset,
  };
}

/** Compile the strict `dateLabels` output grammar. */
export function compileTemporalLabelFormat(
  pattern: string,
  options: TemporalLabelFormatOptions,
): (ms: number) => string {
  const error = temporalLabelConfigurationError(pattern);
  if (error !== null) throw new Error(error);
  return (ms: number) => {
    const d = displayParts(ms, options);
    let out = "";
    for (let index = 0; index < pattern.length; index++) {
      const char = pattern[index]!;
      if (char !== "%") {
        out += char;
        continue;
      }
      const token = pattern[++index]!;
      switch (token) {
        case "Y":
          out += String(d.year);
          break;
        case "y":
          out += pad2(d.year % 100);
          break;
        case "m":
          out += pad2(d.month);
          break;
        case "b":
          out += d.monthShort;
          break;
        case "B":
          out += d.monthLong;
          break;
        case "d":
          out += pad2(d.day);
          break;
        case "e":
          out += String(d.day);
          break;
        case "a":
          out += d.weekdayShort;
          break;
        case "A":
          out += d.weekdayLong;
          break;
        case "H":
          out += pad2(d.hour);
          break;
        case "I":
          out += pad2(d.hour % 12 || 12);
          break;
        case "M":
          out += pad2(d.minute);
          break;
        case "S":
          out += pad2(d.second);
          break;
        case "L":
          out += pad3(d.millisecond);
          break;
        case "p":
          out += d.dayPeriod;
          break;
        case "q":
          out += String(Math.floor((d.month - 1) / 3) + 1);
          break;
        case "z":
          out += d.offset;
          break;
        case "Z":
          out += d.zoneShort;
          break;
        case "%":
          out += "%";
          break;
      }
    }
    return out.replaceAll(/[\u00A0\u202F]/g, " ");
  };
}

export interface TemporalTickLabel {
  label: string;
  fullLabel: string;
}

export function formatTemporalTickSequence(
  values: readonly number[],
  options: TemporalLabelFormatOptions & { interval: TemporalInterval; pattern?: string },
): TemporalTickLabel[] {
  const needsMilliseconds =
    options.interval.unit === "millisecond" || values.some((value) => Math.abs(value % 1_000) > 0);
  const full = compileTemporalLabelFormat(
    options.kind === "date"
      ? "%Y-%m-%d"
      : options.kind === "time"
        ? needsMilliseconds
          ? "%H:%M:%S.%L"
          : "%H:%M:%S"
        : needsMilliseconds
          ? "%Y-%m-%d %H:%M:%S.%L %Z"
          : "%Y-%m-%d %H:%M:%S %Z",
    options,
  );
  if (options.pattern !== undefined) {
    const visible = compileTemporalLabelFormat(options.pattern, options);
    return values.map((value) => ({ label: visible(value), fullLabel: full(value) }));
  }
  const parts = values.map((value) => displayParts(value, options));
  // Span-uniform visible labels (#962): pick one format from the whole sequence
  // so an axis never mixes full dates with bare day numbers (or month with/without year).
  // Use min/max over all parts — order may be reversed or unsorted (explicit breaks).
  let minYear = Infinity;
  let maxYear = -Infinity;
  let minDayKey = Infinity;
  let maxDayKey = -Infinity;
  for (const part of parts) {
    minYear = Math.min(minYear, part.year);
    maxYear = Math.max(maxYear, part.year);
    const dayKey = part.year * 12 * 32 + part.month * 32 + part.day;
    minDayKey = Math.min(minDayKey, dayKey);
    maxDayKey = Math.max(maxDayKey, dayKey);
  }
  const multiYear = parts.length > 0 && minYear !== maxYear;
  const multiDay = parts.length > 0 && minDayKey !== maxDayKey;
  const labels = parts.map((part) => {
    let label: string;
    switch (options.interval.unit) {
      case "year":
        // time-of-day (#831) lives on 1970-01-01Z — never emit a calendar year.
        label =
          options.kind === "time" ? `${pad2(part.hour)}:${pad2(part.minute)}` : String(part.year);
        break;
      case "quarter": {
        if (options.kind === "time") {
          label = `${pad2(part.hour)}:${pad2(part.minute)}`;
          break;
        }
        const quarter = `Q${String(Math.floor((part.month - 1) / 3) + 1)}`;
        label = multiYear ? `${quarter} ${String(part.year)}` : quarter;
        break;
      }
      case "month":
        label =
          options.kind === "time"
            ? `${pad2(part.hour)}:${pad2(part.minute)}`
            : multiYear
              ? `${part.monthShort} ${String(part.year)}`
              : part.monthShort;
        break;
      case "week":
      case "day":
        // Floor is month+day so every tick is self-describing (#962); add year when
        // the sequence spans more than one calendar year.
        label =
          options.kind === "time"
            ? `${pad2(part.hour)}:${pad2(part.minute)}`
            : multiYear
              ? `${part.monthShort} ${String(part.day)}, ${String(part.year)}`
              : `${part.monthShort} ${String(part.day)}`;
        break;
      case "hour":
      case "minute": {
        // time-of-day: never prefix a calendar date — values live on 1970-01-01Z.
        const clock = `${pad2(part.hour)}:${pad2(part.minute)}`;
        if (options.kind === "time" || !multiDay) {
          label = clock;
        } else if (multiYear) {
          label = `${part.monthShort} ${String(part.day)}, ${String(part.year)} ${clock}`;
        } else {
          label = `${part.monthShort} ${String(part.day)} ${clock}`;
        }
        break;
      }
      case "second":
        label = `${pad2(part.hour)}:${pad2(part.minute)}:${pad2(part.second)}`;
        break;
      case "millisecond":
        label = `${pad2(part.hour)}:${pad2(part.minute)}:${pad2(part.second)}.${pad3(part.millisecond)}`;
        break;
    }
    return label;
  });
  return values.map((value, index) => ({ label: labels[index]!, fullLabel: full(value) }));
}
