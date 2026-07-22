/**
 * Value-level temporal parsing: closed parser registry, TypeBox schema, engines
 * (ISO / period / ordered / exact format / epoch), and single-value parseTemporal.
 *
 * Column inference and authoring helpers live in temporal-column.ts and
 * temporal.ts (facade). Public package exports re-export from temporal.ts.
 */

import { Temporal as PolyfillTemporal } from "@js-temporal/polyfill";
import Type, { type Static, type TLiteral } from "typebox";

export const TEMPORAL_PARSER_NAMES = [
  "iso",
  "year",
  "ym",
  "my",
  "yq",
  "ymd",
  "ydm",
  "mdy",
  "myd",
  "dmy",
  "dym",
  "ymd_hm",
  "ymd_hms",
  "ydm_hm",
  "ydm_hms",
  "mdy_hm",
  "mdy_hms",
  "myd_hm",
  "myd_hms",
  "dmy_hm",
  "dmy_hms",
  "dym_hm",
  "dym_hms",
] as const;

export type TemporalParserName = (typeof TEMPORAL_PARSER_NAMES)[number];

const TEMPORAL_PARSER_NAME_SCHEMAS = TEMPORAL_PARSER_NAMES.map((name) =>
  Type.Literal(name),
) as unknown as [TLiteral<TemporalParserName>, ...TLiteral<TemporalParserName>[]];

export const TemporalParserSpecSchema = Type.Union(
  [
    Type.Union(TEMPORAL_PARSER_NAME_SCHEMAS),
    Type.Object(
      {
        format: Type.String({
          minLength: 1,
          maxLength: 128,
          description:
            "Closed strftime-style input grammar (maximum 128 characters and 32 tokens). Supported tokens: %Y, %m, %d, %H, %M, %S, %L, %z, %q, and %%.",
        }),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        epoch: Type.Union([Type.Literal("seconds"), Type.Literal("milliseconds")]),
      },
      { additionalProperties: false },
    ),
  ],
  {
    description:
      "A deterministic temporal parser name, exact closed format, or epoch unit. JavaScript callbacks and regular expressions are not portable parsers.",
  },
);

export type TemporalParserSpec = Static<typeof TemporalParserSpecSchema>;
export type TemporalKind = "date" | "datetime";
export type TemporalPrecision =
  | "year"
  | "quarter"
  | "month"
  | "date"
  | "minute"
  | "second"
  | "millisecond";
export type TemporalDisambiguation = "compatible" | "earlier" | "later" | "reject";

export interface TemporalParseOptions {
  timezone?: string;
  disambiguation?: TemporalDisambiguation;
}

export type TemporalParseResult =
  | {
      ok: true;
      epochMs: number;
      kind: TemporalKind;
      precision: TemporalPrecision;
    }
  | { ok: false; reason: string };

export class TemporalParseError extends Error {
  readonly parser: TemporalParserSpec;
  readonly value: unknown;

  constructor(parser: TemporalParserSpec, value: unknown, reason: string) {
    super(
      `Could not parse ${JSON.stringify(value)} with temporal parser ${JSON.stringify(parser)}: ${reason}`,
    );
    this.name = "TemporalParseError";
    this.parser = parser;
    this.value = value;
  }
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

const DEFAULT_PARTS: Omit<DateParts, "year"> = {
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0,
};

const ISO_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const YEAR_RE = /^\d{4}$/;
const YM_RE = /^(\d{4})[-/.](\d{1,2})$/;
const MY_RE = /^(\d{1,2})[-/.](\d{4})$/;
const YQ_RE = /^(\d{4})[-/.]?Q([1-4])$/i;
const ORDERED_DATE_RE =
  /^(\d{1,4})([-/.])(\d{1,4})\2(\d{1,4})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/** @internal Shared fail result for parse engines and column inference. */
export function temporalParseFailure(reason: string): TemporalParseResult {
  return { ok: false, reason };
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function validateParts(parts: DateParts): string | null {
  if (!Number.isInteger(parts.year) || parts.year < 0 || parts.year > 9999) {
    return "year must be an integer from 0000 through 9999";
  }
  if (!Number.isInteger(parts.month) || parts.month < 1 || parts.month > 12) {
    return "month must be from 1 through 12";
  }
  const maxDay = daysInMonth(parts.year, parts.month);
  if (!Number.isInteger(parts.day) || parts.day < 1 || parts.day > maxDay) {
    return `day must be from 1 through ${maxDay} for this month`;
  }
  if (!Number.isInteger(parts.hour) || parts.hour < 0 || parts.hour > 23) {
    return "hour must be from 0 through 23";
  }
  if (!Number.isInteger(parts.minute) || parts.minute < 0 || parts.minute > 59) {
    return "minute must be from 0 through 59";
  }
  if (!Number.isInteger(parts.second) || parts.second < 0 || parts.second > 59) {
    return "second must be from 0 through 59";
  }
  if (!Number.isInteger(parts.millisecond) || parts.millisecond < 0 || parts.millisecond > 999) {
    return "millisecond must be from 0 through 999";
  }
  return null;
}

function utcEpoch(parts: DateParts): number {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, parts.second, parts.millisecond);
  return date.getTime();
}

function parseOffset(offset: string): number | null {
  if (offset === "Z") return 0;
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(offset);
  if (match === null) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours > 23 || minutes > 59) return null;
  const total = (hours * 60 + minutes) * 60_000;
  return match[1] === "+" ? total : -total;
}

/** @internal Shared native-first Temporal implementation for spec-owned calendar semantics. */
export function temporalImplementation(): typeof PolyfillTemporal {
  const nativeTemporal = (globalThis as typeof globalThis & { Temporal?: typeof PolyfillTemporal })
    .Temporal;
  return nativeTemporal ?? PolyfillTemporal;
}

const TIMEZONE_VALIDITY_CACHE = new Map<string, boolean>();

function timezoneValidationFailure(timezone: string | undefined): TemporalParseResult | null {
  if (timezone === undefined || ["UTC", "Etc/UTC", "Z"].includes(timezone)) return null;
  const cached = TIMEZONE_VALIDITY_CACHE.get(timezone);
  if (cached !== undefined) {
    return cached
      ? null
      : temporalParseFailure(`invalid or unsupported timezone ${JSON.stringify(timezone)}`);
  }
  let valid = true;
  try {
    const Temporal = temporalImplementation();
    Temporal.ZonedDateTime.from({
      timeZone: timezone,
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
    });
  } catch {
    valid = false;
  }
  if (TIMEZONE_VALIDITY_CACHE.size >= 64) {
    const oldest = TIMEZONE_VALIDITY_CACHE.keys().next().value;
    if (oldest !== undefined) TIMEZONE_VALIDITY_CACHE.delete(oldest);
  }
  TIMEZONE_VALIDITY_CACHE.set(timezone, valid);
  return valid
    ? null
    : temporalParseFailure(`invalid or unsupported timezone ${JSON.stringify(timezone)}`);
}

function partsToEpoch(
  parts: DateParts,
  options: TemporalParseOptions,
  offset: string | undefined,
  kind: TemporalKind,
): TemporalParseResult {
  const invalid = validateParts(parts);
  if (invalid !== null) return temporalParseFailure(invalid);

  if (offset !== undefined) {
    const offsetMs = parseOffset(offset);
    if (offsetMs === null) return temporalParseFailure("invalid UTC offset");
    const epochMs = utcEpoch(parts) - offsetMs;
    return Number.isFinite(epochMs)
      ? { ok: true, epochMs, kind: "datetime", precision: "second" }
      : temporalParseFailure("instant is outside the supported range");
  }

  // Calendar dates are timezone-free values. Keep them on UTC calendar
  // boundaries so ticks preserve their represented date.
  const timezone = kind === "date" ? "UTC" : (options.timezone ?? "UTC");
  if (timezone === "UTC" || timezone === "Etc/UTC" || timezone === "Z") {
    const epochMs = utcEpoch(parts);
    return Number.isFinite(epochMs)
      ? { ok: true, epochMs, kind: "date", precision: "date" }
      : temporalParseFailure("instant is outside the supported range");
  }

  try {
    const Temporal = temporalImplementation();
    const plain = Temporal.PlainDateTime.from(parts);
    const zoned = plain.toZonedDateTime(timezone, {
      disambiguation: options.disambiguation ?? "reject",
    });
    const epochMs = zoned.epochMilliseconds;
    return Number.isFinite(epochMs)
      ? { ok: true, epochMs, kind: "datetime", precision: "millisecond" }
      : temporalParseFailure("instant is outside the supported range");
  } catch (error) {
    return temporalParseFailure(
      error instanceof Error ? error.message : "invalid timezone or local time",
    );
  }
}

function withMetadata(
  result: TemporalParseResult,
  kind: TemporalKind,
  precision: TemporalPrecision,
): TemporalParseResult {
  return result.ok ? { ...result, kind, precision } : result;
}

function parseISO(value: string, options: TemporalParseOptions): TemporalParseResult {
  const match = ISO_RE.exec(value);
  if (match === null)
    return temporalParseFailure("expected strict ISO YYYY-MM-DD with an optional time and offset");
  const hasTime = match[4] !== undefined;
  const fraction = match[7];
  const parts: DateParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    second: Number(match[6] ?? 0),
    millisecond: fraction === undefined ? 0 : Number(fraction.padEnd(3, "0").slice(0, 3)),
  };
  let precision: TemporalPrecision = "date";
  if (hasTime) {
    precision = "minute";
    if (match[6] !== undefined) precision = "second";
    if (fraction !== undefined) precision = "millisecond";
  }
  return withMetadata(
    partsToEpoch(parts, options, match[8], hasTime ? "datetime" : "date"),
    hasTime ? "datetime" : "date",
    precision,
  );
}

function parsePeriod(
  value: string,
  parser: "year" | "ym" | "my" | "yq",
  options: TemporalParseOptions,
): TemporalParseResult {
  if (parser === "year") {
    if (!YEAR_RE.test(value)) return temporalParseFailure("expected exactly four year digits");
    return withMetadata(
      partsToEpoch({ year: Number(value), ...DEFAULT_PARTS }, options, undefined, "date"),
      "date",
      "year",
    );
  }
  const match =
    parser === "ym" ? YM_RE.exec(value) : parser === "my" ? MY_RE.exec(value) : YQ_RE.exec(value);
  if (match === null) return temporalParseFailure(`value does not match ${parser}`);
  const year = Number(parser === "my" ? match[2] : match[1]);
  const month =
    parser === "yq"
      ? (Number(match[2]) - 1) * 3 + 1
      : Number(parser === "my" ? match[1] : match[2]);
  return withMetadata(
    partsToEpoch(
      { year, month, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 },
      options,
      undefined,
      "date",
    ),
    "date",
    parser === "yq" ? "quarter" : "month",
  );
}

/** Ordered date-family base names (ymd/ydm/…); used by parseOrdered and column auto candidates. */
export const DATE_ORDERS = new Set(["ymd", "ydm", "mdy", "myd", "dmy", "dym"]);

function parseOrdered(
  value: string,
  parser: TemporalParserName,
  options: TemporalParseOptions,
): TemporalParseResult {
  const [order, timePrecision] = parser.split("_") as [string, string | undefined];
  if (!DATE_ORDERS.has(order)) return temporalParseFailure(`unsupported ordered parser ${parser}`);
  const match = ORDERED_DATE_RE.exec(value);
  if (match === null) return temporalParseFailure(`value does not match ${parser}`);
  const values = [Number(match[1]), Number(match[3]), Number(match[4])];
  const mapped: Record<string, number> = {};
  for (let index = 0; index < order.length; index++) mapped[order[index]!] = values[index]!;
  const hasMinute = match[5] !== undefined;
  const hasSecond = match[7] !== undefined;
  if (timePrecision === undefined && hasMinute)
    return temporalParseFailure(`${parser} does not accept a time`);
  if (timePrecision === "hm" && (!hasMinute || hasSecond))
    return temporalParseFailure(`${parser} requires hour and minute only`);
  if (timePrecision === "hms" && !hasSecond)
    return temporalParseFailure(`${parser} requires hour, minute, and second`);
  const parts: DateParts = {
    year: mapped["y"]!,
    month: mapped["m"]!,
    day: mapped["d"]!,
    hour: Number(match[5] ?? 0),
    minute: Number(match[6] ?? 0),
    second: Number(match[7] ?? 0),
    millisecond: 0,
  };
  const precision: TemporalPrecision =
    timePrecision === "hm" ? "minute" : timePrecision === "hms" ? "second" : "date";
  return withMetadata(
    partsToEpoch(parts, options, undefined, timePrecision === undefined ? "date" : "datetime"),
    timePrecision === undefined ? "date" : "datetime",
    precision,
  );
}

const FORMAT_TOKEN_PATTERNS: Readonly<Record<string, string>> = {
  Y: "(\\d{4})",
  m: "(\\d{1,2})",
  d: "(\\d{1,2})",
  H: "(\\d{2})",
  M: "(\\d{2})",
  S: "(\\d{2})",
  L: "(\\d{1,3})",
  z: "(Z|[+-]\\d{2}:?\\d{2})",
  q: "([1-4])",
};

function escapeRegex(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile-time exact-format artifacts only (pattern + capture tokens, or a
 * format-level failure). Shared across scalar parseTemporal, column parsing,
 * helpers, and temporalParserConfigurationError so a column of n values with
 * the same format pays one compile, not n.
 *
 * Only pre-match failures are cached (length, trailing %, unsupported /
 * duplicate tokens). Post-match semantic rules (%Y required, %m+%q, clock
 * completeness) stay value-driven.
 */
type CompiledExactFormat =
  | { ok: true; tokens: readonly string[]; regex: RegExp }
  | { ok: false; reason: string };

const EXACT_FORMAT_CACHE = new Map<string, CompiledExactFormat>();

function compileExactFormat(format: string): CompiledExactFormat {
  const cached = EXACT_FORMAT_CACHE.get(format);
  if (cached !== undefined) return cached;

  let compiled: CompiledExactFormat;
  if (format.length === 0 || format.length > 128) {
    compiled = {
      ok: false,
      reason: "format length must be from 1 through 128 characters",
    };
  } else {
    const tokens: string[] = [];
    let pattern = "^";
    let reason: string | null = null;
    for (let index = 0; index < format.length; index++) {
      const char = format[index]!;
      if (char !== "%") {
        pattern += escapeRegex(char);
        continue;
      }
      const token = format[++index];
      if (token === undefined) {
        reason = "format cannot end with %";
        break;
      }
      if (token === "%") {
        pattern += "%";
        continue;
      }
      const tokenPattern = FORMAT_TOKEN_PATTERNS[token];
      if (tokenPattern === undefined) {
        reason = `unsupported format token %${token}`;
        break;
      }
      if (tokens.includes(token)) {
        reason = `duplicate semantic format token %${token}`;
        break;
      }
      tokens.push(token);
      if (tokens.length > 32) {
        reason = "format may contain at most 32 semantic tokens";
        break;
      }
      pattern += tokenPattern;
    }
    compiled =
      reason === null
        ? { ok: true, tokens, regex: new RegExp(`${pattern}$`) }
        : { ok: false, reason };
  }

  EXACT_FORMAT_CACHE.set(format, compiled);
  return compiled;
}

function parseExactFormat(
  value: string,
  format: string,
  options: TemporalParseOptions,
): TemporalParseResult {
  const compiled = compileExactFormat(format);
  if (!compiled.ok) return temporalParseFailure(compiled.reason);
  const match = compiled.regex.exec(value);
  if (match === null) return temporalParseFailure("value does not match the exact format");
  const values: Record<string, string> = {};
  for (let index = 0; index < compiled.tokens.length; index++) {
    values[compiled.tokens[index]!] = match[index + 1]!;
  }
  if (values["Y"] === undefined) return temporalParseFailure("exact formats require %Y");
  if (values["m"] !== undefined && values["q"] !== undefined)
    return temporalParseFailure("exact formats cannot contain both %m and %q");
  const hasClockTime =
    values["H"] !== undefined ||
    values["M"] !== undefined ||
    values["S"] !== undefined ||
    values["L"] !== undefined;
  if (hasClockTime && (values["H"] === undefined || values["M"] === undefined))
    return temporalParseFailure("time formats require both %H and %M");
  const parts: DateParts = {
    year: Number(values["Y"]),
    month: values["q"] === undefined ? Number(values["m"] ?? 1) : (Number(values["q"]) - 1) * 3 + 1,
    day: Number(values["d"] ?? 1),
    hour: Number(values["H"] ?? 0),
    minute: Number(values["M"] ?? 0),
    second: Number(values["S"] ?? 0),
    millisecond: Number((values["L"] ?? "0").padEnd(3, "0")),
  };
  let precision: TemporalPrecision = "year";
  if (values["m"] !== undefined) precision = "month";
  if (values["q"] !== undefined) precision = "quarter";
  if (values["d"] !== undefined) precision = "date";
  if (hasClockTime) precision = "minute";
  if (values["S"] !== undefined) precision = "second";
  if (values["L"] !== undefined) precision = "millisecond";
  const kind: TemporalKind = hasClockTime || values["z"] !== undefined ? "datetime" : "date";
  return withMetadata(partsToEpoch(parts, options, values["z"], kind), kind, precision);
}

const FORMAT_SAMPLE_VALUES: Readonly<Record<string, string>> = {
  Y: "2000",
  m: "01",
  d: "01",
  H: "12",
  M: "00",
  S: "00",
  L: "000",
  z: "Z",
  q: "1",
  "%": "%",
};

function exactFormatSample(format: string): string {
  let sample = "";
  for (let index = 0; index < format.length; index++) {
    const char = format[index]!;
    if (char !== "%") {
      sample += char;
      continue;
    }
    const token = format[++index];
    if (token === undefined) return sample;
    sample += FORMAT_SAMPLE_VALUES[token] ?? "0";
  }
  return sample;
}

/** Returns a stable reason when parser options are invalid independent of data. */
export function temporalParserConfigurationError(
  parser: TemporalParserSpec | "auto",
  options: TemporalParseOptions = {},
): string | null {
  const timezoneFailure = timezoneValidationFailure(options.timezone);
  if (timezoneFailure !== null && !timezoneFailure.ok) return timezoneFailure.reason;
  if (parser === "auto" || typeof parser === "string" || "epoch" in parser) return null;
  const result = parseExactFormat(exactFormatSample(parser.format), parser.format, options);
  return result.ok ? null : result.reason;
}

export function parseTemporal(
  value: unknown,
  parser: TemporalParserSpec,
  options: TemporalParseOptions = {},
): TemporalParseResult {
  const timezoneFailure = timezoneValidationFailure(options.timezone);
  if (timezoneFailure !== null) return timezoneFailure;
  if (value instanceof Date) {
    const epochMs = value.getTime();
    return Number.isFinite(epochMs)
      ? { ok: true, epochMs, kind: "datetime", precision: "millisecond" }
      : temporalParseFailure("invalid Date value");
  }
  if (typeof parser === "object" && "epoch" in parser) {
    if (
      (typeof value !== "number" && typeof value !== "string") ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return temporalParseFailure(`expected epoch ${parser.epoch}`);
    }
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric))
      return temporalParseFailure(`expected finite epoch ${parser.epoch}`);
    const epochMs = parser.epoch === "seconds" ? numeric * 1000 : numeric;
    return Number.isFinite(new Date(epochMs).getTime())
      ? { ok: true, epochMs, kind: "datetime", precision: "millisecond" }
      : temporalParseFailure("instant is outside the supported range");
  }
  if (typeof value !== "string" || value.trim() !== value)
    return temporalParseFailure("expected an exact temporal string");
  if (typeof parser === "object") return parseExactFormat(value, parser.format, options);
  if (parser === "iso") return parseISO(value, options);
  if (parser === "year" || parser === "ym" || parser === "my" || parser === "yq") {
    return parsePeriod(value, parser, options);
  }
  return parseOrdered(value, parser, options);
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    const codePoint = value.codePointAt(index)!;
    hash ^= codePoint;
    hash = Math.imul(hash, 0x01000193);
    if (codePoint > 0xffff) index++;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function canonicalTemporalParserKey(parser: TemporalParserSpec): string {
  if (typeof parser === "string") return `name:${parser}`;
  if ("epoch" in parser) return `epoch:${parser.epoch}`;
  return `format:${fnv1a(parser.format)}:${JSON.stringify(parser.format)}`;
}
