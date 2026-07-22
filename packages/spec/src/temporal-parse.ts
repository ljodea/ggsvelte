/**
 * Value-level temporal parsing: named engines (ISO / period / ordered), epoch,
 * and the parseTemporal dispatcher. Exact format: temporal-parse-format.ts.
 * Calendar foundation + public types: temporal-parse-core.ts.
 *
 * Column inference and authoring helpers live in temporal-column.ts and
 * temporal.ts (facade). Public package exports re-export from temporal.ts.
 */

import {
  DEFAULT_PARTS,
  partsToEpoch,
  temporalParseFailure,
  timezoneValidationFailure,
  withMetadata,
  type DateParts,
  type TemporalParseOptions,
  type TemporalParseResult,
  type TemporalParserName,
  type TemporalParserSpec,
  type TemporalPrecision,
} from "./temporal-parse-core.js";
import { exactFormatConfigurationError, parseExactFormat } from "./temporal-parse-format.js";

// Stable public import path: re-export foundation surface from this module.
export {
  TEMPORAL_PARSER_NAMES,
  TemporalParserSpecSchema,
  TemporalParseError,
  temporalParseFailure,
  temporalImplementation,
  type TemporalDisambiguation,
  type TemporalKind,
  type TemporalParseOptions,
  type TemporalParseResult,
  type TemporalParserName,
  type TemporalParserSpec,
  type TemporalPrecision,
} from "./temporal-parse-core.js";

const ISO_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const YEAR_RE = /^\d{4}$/;
const YM_RE = /^(\d{4})[-/.](\d{1,2})$/;
const MY_RE = /^(\d{1,2})[-/.](\d{4})$/;
const YQ_RE = /^(\d{4})[-/.]?Q([1-4])$/i;
const ORDERED_DATE_RE =
  /^(\d{1,4})([-/.])(\d{1,4})\2(\d{1,4})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

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

/** Returns a stable reason when parser options are invalid independent of data. */
export function temporalParserConfigurationError(
  parser: TemporalParserSpec | "auto",
  options: TemporalParseOptions = {},
): string | null {
  const timezoneFailure = timezoneValidationFailure(options.timezone);
  if (timezoneFailure !== null && !timezoneFailure.ok) return timezoneFailure.reason;
  if (parser === "auto" || typeof parser === "string" || "epoch" in parser) return null;
  return exactFormatConfigurationError(parser.format, options);
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
