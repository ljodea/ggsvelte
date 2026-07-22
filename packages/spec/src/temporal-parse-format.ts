/**
 * Exact-format temporal engine: closed strftime-style compile cache + parse.
 * Used by parseTemporal and temporalParserConfigurationError via temporal-parse.ts.
 * Foundation: temporal-parse-core.ts.
 */
import {
  partsToEpoch,
  temporalParseFailure,
  withMetadata,
  type DateParts,
  type TemporalKind,
  type TemporalParseOptions,
  type TemporalParseResult,
  type TemporalPrecision,
} from "./temporal-parse-core.js";

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

/** Cap retained formats so adversarial/churned author strings cannot grow unbounded. */
const EXACT_FORMAT_CACHE_MAX = 256;
const EXACT_FORMAT_CACHE = new Map<string, CompiledExactFormat>();

function compileExactFormat(format: string): CompiledExactFormat {
  // Length failures must not touch the cache: keys would retain arbitrary
  // user strings (including multi-MB rejects) for process lifetime (#451).
  if (format.length === 0 || format.length > 128) {
    return {
      ok: false,
      reason: "format length must be from 1 through 128 characters",
    };
  }

  const cached = EXACT_FORMAT_CACHE.get(format);
  if (cached !== undefined) {
    // Refresh LRU order (Map iterates in insertion order).
    EXACT_FORMAT_CACHE.delete(format);
    EXACT_FORMAT_CACHE.set(format, cached);
    return cached;
  }

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
  const compiled: CompiledExactFormat =
    reason === null
      ? { ok: true, tokens, regex: new RegExp(`${pattern}$`) }
      : { ok: false, reason };

  if (EXACT_FORMAT_CACHE.size >= EXACT_FORMAT_CACHE_MAX) {
    const oldest = EXACT_FORMAT_CACHE.keys().next().value;
    if (oldest !== undefined) EXACT_FORMAT_CACHE.delete(oldest);
  }
  EXACT_FORMAT_CACHE.set(format, compiled);
  return compiled;
}

export function parseExactFormat(
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

/**
 * Validate an exact format string independent of data values (sample parse).
 * Keeps sample generation private to this module.
 */
export function exactFormatConfigurationError(
  format: string,
  options: TemporalParseOptions = {},
): string | null {
  const result = parseExactFormat(exactFormatSample(format), format, options);
  return result.ok ? null : result.reason;
}
