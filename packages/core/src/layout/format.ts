import {
  temporalLabelConfigurationError,
  type TemporalInterval,
  type TemporalKind,
} from "@ggsvelte/spec";

/**
 * Label format strings (the `scales.*.labels` surface).
 *
 * Numeric formats — a small, documented d3-format-style subset (hand-rolled;
 * the full d3-format grammar is deliberately NOT claimed):
 *   "d"     integer (rounded)
 *   ",d"    integer with thousands grouping
 *   ".2f"   fixed decimals (any digit count)
 *   ",.2f"  fixed decimals with grouping
 *   ".0%"   percent (value * 100, fixed decimals)
 *   "~s"    SI prefix (1500 -> "1.5k"), trailing zeros trimmed
 *   "s"     SI prefix, 3 significant digits
 *
 * Time formats — a strftime-style subset over UTC (hand-rolled; decision
 * recorded in docs/decisions/0008: no d3-time-format dependency, formatting
 * is deterministic en-US):
 *   %Y %y %m %b %B %d %e %H %M %S %L %%
 *
 * Unknown format strings fall back to default formatting and report
 * `ok: false` so the pipeline can emit a warning (never throw over a label).
 */

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");
const pad3 = (n: number) => String(n).padStart(3, "0");

/** Format an epoch-ms timestamp with a strftime-style pattern (UTC). */
export function formatTime(ms: number, pattern: string): string {
  const d = new Date(ms);
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]!;
    if (ch !== "%") {
      out += ch;
      continue;
    }
    const code = pattern[++i] ?? "";
    switch (code) {
      case "Y":
        out += String(d.getUTCFullYear());
        break;
      case "y":
        out += pad2(d.getUTCFullYear() % 100);
        break;
      case "m":
        out += pad2(d.getUTCMonth() + 1);
        break;
      case "b":
        out += MONTHS_SHORT[d.getUTCMonth()]!;
        break;
      case "B":
        out += MONTHS_LONG[d.getUTCMonth()]!;
        break;
      case "d":
        out += pad2(d.getUTCDate());
        break;
      case "e":
        out += String(d.getUTCDate());
        break;
      case "H":
        out += pad2(d.getUTCHours());
        break;
      case "M":
        out += pad2(d.getUTCMinutes());
        break;
      case "S":
        out += pad2(d.getUTCSeconds());
        break;
      case "L":
        out += pad3(d.getUTCMilliseconds());
        break;
      case "%":
        out += "%";
        break;
      default:
        out += `%${code}`; // unknown token passes through literally
        break;
    }
  }
  return out;
}

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
  const configuredTimezone = options.kind === "date" ? "UTC" : (options.timezone ?? "UTC");
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
  const labels = parts.map((part, index) => {
    const previous = parts[index - 1];
    const first = previous === undefined;
    const changedYear = first || part.year !== previous.year;
    const changedMonth = changedYear || part.month !== previous.month;
    let label: string;
    switch (options.interval.unit) {
      case "year":
        label = String(part.year);
        break;
      case "quarter":
        label = `Q${String(Math.floor((part.month - 1) / 3) + 1)}${first || changedYear ? ` ${String(part.year)}` : ""}`;
        break;
      case "month":
        label = `${part.monthShort}${first || changedYear ? ` ${String(part.year)}` : ""}`;
        break;
      case "week":
      case "day":
        label = changedMonth
          ? `${part.monthShort} ${String(part.day)}, ${String(part.year)}`
          : String(part.day);
        break;
      case "hour":
      case "minute":
        label = `${changedMonth || part.day !== previous?.day ? `${part.monthShort} ${String(part.day)} ` : ""}${pad2(part.hour)}:${pad2(part.minute)}`;
        break;
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

const NUMERIC_FORMAT_RE = /^(,)?(?:\.(\d+))?(~)?([dfs%])$/;

const SI_PREFIXES: [number, string][] = [
  [1e12, "T"],
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
];

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

function siFormat(v: number, tilde: boolean, precision: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  let scale = 1;
  let prefix = "";
  for (const [factor, p] of SI_PREFIXES) {
    if (abs >= factor) {
      scale = factor;
      prefix = p;
      break;
    }
  }
  const scaled = v / scale;
  const digits = Math.max(0, precision - 1 - Math.floor(Math.log10(Math.abs(scaled))));
  const fixed = scaled.toFixed(Math.min(20, digits));
  return (tilde ? trimZeros(fixed) : fixed) + prefix;
}

export interface NumberFormatter {
  /** False when the format string was not recognized (fallback in effect). */
  ok: boolean;
  format(v: number): string;
}

/** Compile a numeric label format string (subset documented above). */
export function numberFormatter(spec: string): NumberFormatter {
  const match = NUMERIC_FORMAT_RE.exec(spec);
  if (match === null) {
    return { ok: false, format: String };
  }
  const grouped = match[1] === ",";
  const decimals = match[2] === undefined ? undefined : Number(match[2]);
  const tilde = match[3] === "~";
  const type = match[4]!;
  const locale = (v: number, digits: number) =>
    v.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: grouped,
    });
  switch (type) {
    case "d":
      return {
        ok: true,
        format: (v) => (Number.isFinite(v) ? locale(Math.round(v), 0) : String(v)),
      };
    case "f": {
      const digits = decimals ?? 2;
      return { ok: true, format: (v) => (Number.isFinite(v) ? locale(v, digits) : String(v)) };
    }
    case "%": {
      const digits = decimals ?? 0;
      return {
        ok: true,
        format: (v) => (Number.isFinite(v) ? locale(v * 100, digits) + "%" : String(v)),
      };
    }
    default: // "s"
      return {
        ok: true,
        format: (v) => (Number.isFinite(v) ? siFormat(v, tilde, decimals ?? 3) : String(v)),
      };
  }
}
