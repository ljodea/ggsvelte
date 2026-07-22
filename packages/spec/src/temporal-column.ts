/**
 * Column-level temporal inference and materialization.
 *
 * Classifies whole columns (auto parser selection + whole-column validation)
 * and builds semantic/valid arrays. Value-level engines live in temporal-parse.ts.
 */

import {
  DATE_ORDERS,
  TEMPORAL_PARSER_NAMES,
  canonicalTemporalParserKey,
  parseTemporal,
  temporalParseFailure,
  type TemporalKind,
  type TemporalParseOptions,
  type TemporalParserName,
  type TemporalParserSpec,
  type TemporalPrecision,
} from "./temporal-parse.js";

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
          ? temporalParseFailure("mixed non-Date value in native Date column")
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
