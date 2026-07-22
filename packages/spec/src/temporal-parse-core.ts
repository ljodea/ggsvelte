/**
 * Temporal parse foundation: public types/schema, calendar parts→epoch conversion,
 * timezone validation, and shared Temporal implementation.
 *
 * Engines: temporal-parse-format.ts (exact format), temporal-parse.ts (named parsers + dispatcher).
 * Facade: temporal.ts.
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

/** @internal Shared calendar fields for named and exact-format engines. */
export interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

export const DEFAULT_PARTS: Omit<DateParts, "year"> = {
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0,
};

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

export function timezoneValidationFailure(
  timezone: string | undefined,
): TemporalParseResult | null {
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

export function partsToEpoch(
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

export function withMetadata(
  result: TemporalParseResult,
  kind: TemporalKind,
  precision: TemporalPrecision,
): TemporalParseResult {
  return result.ok ? { ...result, kind, precision } : result;
}
