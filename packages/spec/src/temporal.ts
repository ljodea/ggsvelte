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

export interface TemporalFailure {
  index: number;
  value: string | number | boolean | null;
  reason: string;
}

export interface TemporalDecision {
  status: "temporal" | "nominal" | "ambiguous" | "invalid";
  parser: string | null;
  parserKey: string;
  kind: TemporalKind | null;
  precision: TemporalPrecision | null;
  evidence: readonly (string | number | boolean | null)[];
  nonNullCount: number;
  validatedCount: number;
  failedCount: number;
  candidates: readonly string[];
  failures?: readonly TemporalFailure[];
}

export interface ParsedTemporalColumn {
  decision: TemporalDecision;
  semantic: Float64Array;
  valid: Uint8Array;
}

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

const PRECISION_RANK: Readonly<Record<TemporalPrecision, number>> = {
  year: 0,
  quarter: 1,
  month: 2,
  date: 3,
  minute: 4,
  second: 5,
  millisecond: 6,
};

function finestPrecision(
  current: TemporalPrecision | null,
  candidate: TemporalPrecision,
): TemporalPrecision {
  return current === null || PRECISION_RANK[candidate] > PRECISION_RANK[current]
    ? candidate
    : current;
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

function failure(reason: string): TemporalParseResult {
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

function temporalImplementation(): typeof PolyfillTemporal {
  const nativeTemporal = (globalThis as typeof globalThis & { Temporal?: typeof PolyfillTemporal })
    .Temporal;
  return nativeTemporal ?? PolyfillTemporal;
}

const TIMEZONE_VALIDITY_CACHE = new Map<string, boolean>();

function timezoneValidationFailure(timezone: string | undefined): TemporalParseResult | null {
  if (timezone === undefined || ["UTC", "Etc/UTC", "Z"].includes(timezone)) return null;
  const cached = TIMEZONE_VALIDITY_CACHE.get(timezone);
  if (cached !== undefined) {
    return cached ? null : failure(`invalid or unsupported timezone ${JSON.stringify(timezone)}`);
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
  return valid ? null : failure(`invalid or unsupported timezone ${JSON.stringify(timezone)}`);
}

function partsToEpoch(
  parts: DateParts,
  options: TemporalParseOptions,
  offset: string | undefined,
  kind: TemporalKind,
): TemporalParseResult {
  const invalid = validateParts(parts);
  if (invalid !== null) return failure(invalid);

  if (offset !== undefined) {
    const offsetMs = parseOffset(offset);
    if (offsetMs === null) return failure("invalid UTC offset");
    const epochMs = utcEpoch(parts) - offsetMs;
    return Number.isFinite(epochMs)
      ? { ok: true, epochMs, kind: "datetime", precision: "second" }
      : failure("instant is outside the supported range");
  }

  // Calendar dates are timezone-free values. Keep them on UTC calendar
  // boundaries so ticks preserve their represented date.
  const timezone = kind === "date" ? "UTC" : (options.timezone ?? "UTC");
  if (timezone === "UTC" || timezone === "Etc/UTC" || timezone === "Z") {
    const epochMs = utcEpoch(parts);
    return Number.isFinite(epochMs)
      ? { ok: true, epochMs, kind: "date", precision: "date" }
      : failure("instant is outside the supported range");
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
      : failure("instant is outside the supported range");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "invalid timezone or local time");
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
    return failure("expected strict ISO YYYY-MM-DD with an optional time and offset");
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
    if (!YEAR_RE.test(value)) return failure("expected exactly four year digits");
    return withMetadata(
      partsToEpoch({ year: Number(value), ...DEFAULT_PARTS }, options, undefined, "date"),
      "date",
      "year",
    );
  }
  const match =
    parser === "ym" ? YM_RE.exec(value) : parser === "my" ? MY_RE.exec(value) : YQ_RE.exec(value);
  if (match === null) return failure(`value does not match ${parser}`);
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

const DATE_ORDERS = new Set(["ymd", "ydm", "mdy", "myd", "dmy", "dym"]);

function parseOrdered(
  value: string,
  parser: TemporalParserName,
  options: TemporalParseOptions,
): TemporalParseResult {
  const [order, timePrecision] = parser.split("_") as [string, string | undefined];
  if (!DATE_ORDERS.has(order)) return failure(`unsupported ordered parser ${parser}`);
  const match = ORDERED_DATE_RE.exec(value);
  if (match === null) return failure(`value does not match ${parser}`);
  const values = [Number(match[1]), Number(match[3]), Number(match[4])];
  const mapped: Record<string, number> = {};
  for (let index = 0; index < order.length; index++) mapped[order[index]!] = values[index]!;
  const hasMinute = match[5] !== undefined;
  const hasSecond = match[7] !== undefined;
  if (timePrecision === undefined && hasMinute) return failure(`${parser} does not accept a time`);
  if (timePrecision === "hm" && (!hasMinute || hasSecond))
    return failure(`${parser} requires hour and minute only`);
  if (timePrecision === "hms" && !hasSecond)
    return failure(`${parser} requires hour, minute, and second`);
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

function parseExactFormat(
  value: string,
  format: string,
  options: TemporalParseOptions,
): TemporalParseResult {
  if (format.length === 0 || format.length > 128)
    return failure("format length must be from 1 through 128 characters");
  const tokens: string[] = [];
  let pattern = "^";
  for (let index = 0; index < format.length; index++) {
    const char = format[index]!;
    if (char !== "%") {
      pattern += escapeRegex(char);
      continue;
    }
    const token = format[++index];
    if (token === undefined) return failure("format cannot end with %");
    if (token === "%") {
      pattern += "%";
      continue;
    }
    const tokenPattern = FORMAT_TOKEN_PATTERNS[token];
    if (tokenPattern === undefined) return failure(`unsupported format token %${token}`);
    if (tokens.includes(token)) return failure(`duplicate semantic format token %${token}`);
    tokens.push(token);
    if (tokens.length > 32) return failure("format may contain at most 32 semantic tokens");
    pattern += tokenPattern;
  }
  pattern += "$";
  const match = new RegExp(pattern).exec(value);
  if (match === null) return failure("value does not match the exact format");
  const values: Record<string, string> = {};
  for (let index = 0; index < tokens.length; index++) values[tokens[index]!] = match[index + 1]!;
  if (values["Y"] === undefined) return failure("exact formats require %Y");
  if (values["m"] !== undefined && values["q"] !== undefined)
    return failure("exact formats cannot contain both %m and %q");
  const hasClockTime =
    values["H"] !== undefined ||
    values["M"] !== undefined ||
    values["S"] !== undefined ||
    values["L"] !== undefined;
  if (hasClockTime && (values["H"] === undefined || values["M"] === undefined))
    return failure("time formats require both %H and %M");
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
      : failure("invalid Date value");
  }
  if (typeof parser === "object" && "epoch" in parser) {
    if ((typeof value !== "number" && typeof value !== "string") || value === "") {
      return failure(`expected epoch ${parser.epoch}`);
    }
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return failure(`expected finite epoch ${parser.epoch}`);
    const epochMs = parser.epoch === "seconds" ? numeric * 1000 : numeric;
    return Number.isFinite(new Date(epochMs).getTime())
      ? { ok: true, epochMs, kind: "datetime", precision: "millisecond" }
      : failure("instant is outside the supported range");
  }
  if (typeof value !== "string" || value.trim() !== value)
    return failure("expected an exact temporal string");
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

function evidenceValue(value: unknown): string | number | boolean | null {
  if (value instanceof Date)
    return Number.isFinite(value.getTime()) ? value.toISOString() : "Invalid Date";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  return JSON.stringify(value) ?? "unsupported value";
}

function representativeNonNull(values: readonly unknown[]): unknown[] {
  const nonNull = values.filter((value) => value !== null && value !== undefined);
  if (nonNull.length <= 64) return nonNull;
  return [...nonNull.slice(0, 32), ...nonNull.slice(-32)];
}

const AUTO_ORDERED_PARSERS = TEMPORAL_PARSER_NAMES.filter((parser): parser is TemporalParserName =>
  DATE_ORDERS.has(parser.split("_")[0]!),
);

function candidateParsers(
  sample: readonly unknown[],
  options: TemporalParseOptions,
): TemporalParserName[] {
  const strings = sample.filter((value): value is string => typeof value === "string");
  const nonDates = sample.filter((value) => !(value instanceof Date));
  const mixedWithDates = strings.length > 0 && sample.some((value) => value instanceof Date);
  if (strings.length === 0 && sample.every((value) => value instanceof Date)) return [];
  if (strings.length !== nonDates.length) return [];
  if (strings.every((value) => parseTemporal(value, "iso", options).ok)) return ["iso"];
  // Native Date values are instants. Mixing them with lower-precision year,
  // month, quarter, or ordered-date strings has no coherent parser identity.
  if (mixedWithDates) return [];
  for (const parser of ["year", "ym", "my", "yq"] as const) {
    if (strings.every((value) => parseTemporal(value, parser, options).ok)) return [parser];
  }
  // Explicit ordered parsers may accept compact years, but automatic
  // inference never assigns meaning to a two-digit year.
  if (strings.some((value) => !/(?:^|[-/.])\d{4}(?:[-/.]|[T ]|$)/.test(value))) return [];
  return AUTO_ORDERED_PARSERS.filter((parser) =>
    strings.every((value) => {
      if (value.includes("-") && /^\d{4}-\d{2}-\d{2}/.test(value)) return false;
      return parseTemporal(value, parser, options).ok;
    }),
  );
}

function nominalDecision(
  status: TemporalDecision["status"],
  values: readonly unknown[],
  candidates: readonly string[] = [],
): TemporalDecision {
  const nonNull = values.filter((value) => value !== null && value !== undefined);
  return {
    status,
    parser: null,
    parserKey: `auto:${status}`,
    kind: null,
    precision: null,
    evidence: representativeNonNull(values)
      .slice(0, 8)
      .map((value) => evidenceValue(value)),
    nonNullCount: nonNull.length,
    validatedCount: 0,
    failedCount: 0,
    candidates,
  };
}

function inferTemporalColumnInternal(
  values: readonly unknown[],
  options: TemporalParseOptions = {},
  onSuccess?: (index: number, epochMs: number) => void,
): TemporalDecision {
  const nonNull = values.filter((value) => value !== null && value !== undefined);
  if (nonNull.length === 0) return nominalDecision("nominal", values);
  if (nonNull.some((value) => typeof value === "number" || typeof value === "boolean")) {
    return nominalDecision("nominal", values);
  }
  const sample = representativeNonNull(values);
  if (sample.some((value) => !(value instanceof Date) && typeof value !== "string")) {
    return nominalDecision("nominal", values);
  }
  const candidates = candidateParsers(sample, options);
  const allDates = sample.every((value) => value instanceof Date);
  if (!allDates && candidates.length === 0) return nominalDecision("nominal", values);
  if (candidates.length > 1) return nominalDecision("ambiguous", values, candidates);

  const parser = allDates ? null : candidates[0]!;
  let validatedCount = 0;
  const failures: TemporalFailure[] = [];
  let kind: TemporalKind | null = null;
  let precision: TemporalPrecision | null = null;
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (value === null || value === undefined) continue;
    const parsed =
      value instanceof Date
        ? parseTemporal(value, "iso", options)
        : parser === null
          ? failure("mixed non-Date value in native Date column")
          : parseTemporal(value, parser, options);
    if (!parsed.ok) {
      if (failures.length < 5)
        failures.push({ index, value: evidenceValue(value), reason: parsed.reason });
      continue;
    }
    validatedCount++;
    onSuccess?.(index, parsed.epochMs);
    kind = kind === "datetime" || parsed.kind === "datetime" ? "datetime" : "date";
    precision = finestPrecision(precision, parsed.precision);
  }
  const failedCount = nonNull.length - validatedCount;
  if (failedCount > 0) {
    return {
      ...nominalDecision("invalid", values, parser === null ? ["native-date"] : [parser]),
      parser,
      parserKey: `auto:${parser ?? "native-date"}:invalid`,
      validatedCount,
      failedCount,
      failures,
    };
  }
  return {
    status: "temporal",
    parser: parser ?? "native-date",
    parserKey: `auto:${parser ?? "native-date"}`,
    kind: kind ?? "datetime",
    precision: precision ?? "millisecond",
    evidence: sample.slice(0, 8).map((value) => evidenceValue(value)),
    nonNullCount: nonNull.length,
    validatedCount,
    failedCount: 0,
    candidates: parser === null ? ["native-date"] : [parser],
  };
}

export function inferTemporalColumn(
  values: readonly unknown[],
  options: TemporalParseOptions = {},
): TemporalDecision {
  return inferTemporalColumnInternal(values, options);
}

export function parseTemporalColumn(
  values: readonly unknown[],
  parser: TemporalParserSpec | "auto" = "auto",
  options: TemporalParseOptions = {},
): ParsedTemporalColumn {
  const semantic = new Float64Array(values.length);
  semantic.fill(Number.NaN);
  const valid = new Uint8Array(values.length);
  if (parser === "auto") {
    const decision = inferTemporalColumnInternal(values, options, (index, epochMs) => {
      semantic[index] = epochMs;
      valid[index] = 1;
    });
    if (decision.status !== "temporal") {
      semantic.fill(Number.NaN);
      valid.fill(0);
    }
    return { decision, semantic, valid };
  }

  let validatedCount = 0;
  let nonNullCount = 0;
  let kind: TemporalKind | null = null;
  let precision: TemporalPrecision | null = null;
  const failures: TemporalFailure[] = [];
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (value === null || value === undefined) continue;
    nonNullCount++;
    const result = parseTemporal(value, parser, options);
    if (!result.ok) {
      if (failures.length < 5)
        failures.push({ index, value: evidenceValue(value), reason: result.reason });
      continue;
    }
    semantic[index] = result.epochMs;
    valid[index] = 1;
    validatedCount++;
    kind = kind === "datetime" || result.kind === "datetime" ? "datetime" : "date";
    precision = finestPrecision(precision, result.precision);
  }
  const failedCount = nonNullCount - validatedCount;
  const parserKey = canonicalTemporalParserKey(parser);
  return {
    semantic,
    valid,
    decision: {
      status: failedCount === 0 ? "temporal" : "invalid",
      parser: typeof parser === "string" ? parser : parserKey,
      parserKey,
      kind: kind ?? null,
      precision: precision ?? null,
      evidence: representativeNonNull(values)
        .slice(0, 8)
        .map((value) => evidenceValue(value)),
      nonNullCount,
      validatedCount,
      failedCount,
      candidates: [parserKey],
      ...(failures.length > 0 && { failures }),
    },
  };
}

function convertOne(value: unknown, parser: TemporalParserSpec): Date {
  const result = parseTemporal(value, parser);
  if (!result.ok) throw new TemporalParseError(parser, value, result.reason);
  return new Date(result.epochMs);
}

function helper(parser: TemporalParserSpec) {
  function convert(value: unknown): Date;
  function convert(values: readonly unknown[]): Date[];
  function convert(value: unknown): Date | Date[] {
    return Array.isArray(value)
      ? value.map((entry) => convertOne(entry, parser))
      : convertOne(value, parser);
  }
  return convert;
}

export const ymd = helper("ymd");
export const ydm = helper("ydm");
export const mdy = helper("mdy");
export const myd = helper("myd");
export const dmy = helper("dmy");
export const dym = helper("dym");
export const ym = helper("ym");
export const my = helper("my");
export const yq = helper("yq");
export const ymd_hm = helper("ymd_hm");
export const ymd_hms = helper("ymd_hms");
export const ydm_hm = helper("ydm_hm");
export const ydm_hms = helper("ydm_hms");
export const mdy_hm = helper("mdy_hm");
export const mdy_hms = helper("mdy_hms");
export const myd_hm = helper("myd_hm");
export const myd_hms = helper("myd_hms");
export const dmy_hm = helper("dmy_hm");
export const dmy_hms = helper("dmy_hms");
export const dym_hm = helper("dym_hm");
export const dym_hms = helper("dym_hms");

export function parseTemporalFormat(value: unknown, format: string): Date;
export function parseTemporalFormat(values: readonly unknown[], format: string): Date[];
export function parseTemporalFormat(value: unknown, format: string): Date | Date[] {
  return Array.isArray(value)
    ? value.map((entry) => convertOne(entry, { format }))
    : convertOne(value, { format });
}

export function fromEpochSeconds(value: number): Date;
export function fromEpochSeconds(values: readonly number[]): Date[];
export function fromEpochSeconds(value: number | readonly number[]): Date | Date[] {
  return Array.isArray(value)
    ? value.map((entry) => convertOne(entry, { epoch: "seconds" }))
    : convertOne(value, { epoch: "seconds" });
}

export function fromEpochMilliseconds(value: number): Date;
export function fromEpochMilliseconds(values: readonly number[]): Date[];
export function fromEpochMilliseconds(value: number | readonly number[]): Date | Date[] {
  return Array.isArray(value)
    ? value.map((entry) => convertOne(entry, { epoch: "milliseconds" }))
    : convertOne(value, { epoch: "milliseconds" });
}
