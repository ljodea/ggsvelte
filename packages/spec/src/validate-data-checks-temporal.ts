/**
 * Shared temporal decision memoization for data-aware scale checks.
 * Used by position (x/y), color/fill, and numeric style scale compatibility.
 * Orchestrator: validate-data-checks.ts.
 */
import type { SpecError } from "./errors.js";
import { parseTemporalColumn, type TemporalDecision } from "./temporal-column.js";
import {
  canonicalTemporalParserKey,
  type TemporalParseOptions,
  type TemporalParserSpec,
  type TemporalScaleKind,
} from "./temporal-parse.js";
import type { FieldEvidenceEntry } from "./validate-data-evidence.js";

/** Channel field use collected during the layer walk (position or color). */
export interface ChannelFieldUse {
  field: string;
  path: string;
}

/**
 * True when a scale's `parse` value is safe to hand to temporalDecisionForField.
 *
 * A schema-invalid parser (e.g. `123`, `true`, `{}`, `[]`) is collected as a
 * schema error, but tier-2 data checks still run, so a malformed value can reach
 * this helper's `canonicalTemporalParserKey` — which does `"epoch" in parser`
 * (throws on a non-object) and reads `parser.format` (throws inside fnv1a on an
 * empty object). Only `undefined`, a string, or a well-formed `{ epoch }` /
 * `{ format }` object is usable; anything else must defer to the schema
 * diagnostic instead of crashing validation.
 */
export function temporalParserUsable(parse: unknown): boolean {
  if (parse === undefined || typeof parse === "string") return true;
  if (typeof parse !== "object" || parse === null || Array.isArray(parse)) return false;
  return (
    typeof (parse as { epoch?: unknown }).epoch === "string" ||
    typeof (parse as { format?: unknown }).format === "string"
  );
}

/**
 * One cache per dataChecks() call — shared by position, color, and style checkers.
 *
 * Outer key: field + parser + timezone + disambiguation.
 * Inner key: the FieldEvidenceEntry object (null when info is missing). Layers
 * that share a named dataset reuse the same entry object, so multi-consumer
 * memoization still hits. Layers with different datasets get different entries
 * and must not share a decision under the same field name (#1339).
 */
export type TemporalDecisionCache = Map<
  string,
  Map<FieldEvidenceEntry | null, TemporalDecision | null | undefined>
>;

/**
 * Resolve one field's temporal decision for scale compatibility checks.
 *
 * Memoized per dataChecks() call so multi-layer / multi-channel consumers of
 * the same field evidence under the same parser+options pay O(n) once, not O(U·n).
 * When parser is auto and options match the evidence pass (no timezone /
 * disambiguation), reuse FieldEvidenceEntry.temporal instead of re-scanning.
 *
 * Cache key omits parseFailure and temporalKind — those only affect how the
 * decision is interpreted, not the decision itself. Dataset identity is the
 * FieldEvidenceEntry object identity (inner map key).
 */
export function temporalDecisionForField(
  cache: TemporalDecisionCache,
  field: string,
  info: FieldEvidenceEntry | undefined,
  parser: TemporalParserSpec | "auto",
  options: TemporalParseOptions,
): TemporalDecision | null | undefined {
  const parserKey = parser === "auto" ? "auto" : canonicalTemporalParserKey(parser);
  const key = `${field}\0${parserKey}\0${options.timezone ?? ""}\0${options.disambiguation ?? ""}`;
  let byInfo = cache.get(key);
  if (byInfo === undefined) {
    byInfo = new Map();
    cache.set(key, byInfo);
  }
  const infoKey = info ?? null;
  if (byInfo.has(infoKey)) return byInfo.get(infoKey);

  let decision: TemporalDecision | null | undefined;
  if (info?.values === null || info?.values === undefined) {
    // Profile-backed fields: no inline values. temporal is always null today.
    decision = info?.temporal ?? null;
  } else if (
    parser === "auto" &&
    options.timezone === undefined &&
    options.disambiguation === undefined &&
    info.temporal !== null
  ) {
    // Evidence was built with inferTemporalColumn(column) — same auto defaults.
    decision = info.temporal;
  } else {
    decision = parseTemporalColumn(info.values, parser, options).decision;
  }
  byInfo.set(infoKey, decision);
  return decision;
}

export function appendTemporalKindMismatch(
  errors: SpecError[],
  input: {
    axis: "x" | "y";
    path: string;
    field: string;
    expected: TemporalScaleKind | undefined;
    actual: "date" | "datetime" | "time" | null;
  },
): void {
  const { axis, path, field, expected, actual } = input;
  if (expected === undefined || actual === null || actual === expected) return;
  // scale_*_time reduces date/datetime to UTC clock portion (#831); not a mismatch.
  if (expected === "time" && (actual === "date" || actual === "datetime")) return;
  // monthDay takes the month-day off a full date and drops the rest, so a field
  // parsing as date or datetime is exactly what it expects to be given.
  if (expected === "monthDay" && (actual === "date" || actual === "datetime")) return;
  errors.push({
    code: "scale-type-mismatch",
    path,
    message: `scales.${axis}.temporalKind is "${expected}" but field "${field}" parses as ${actual}.`,
    fix: {
      description: `Use temporalKind "${actual}" or choose a parser that produces ${expected} values.`,
    },
  });
}
