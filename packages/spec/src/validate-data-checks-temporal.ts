/**
 * Shared temporal decision memoization for data-aware scale checks.
 * Used by position (x/y) and color/fill scale compatibility.
 * Orchestrator: validate-data-checks.ts.
 */
import type { SpecError } from "./errors.js";
import { parseTemporalColumn, type TemporalDecision } from "./temporal-column.js";
import {
  canonicalTemporalParserKey,
  type TemporalParseOptions,
  type TemporalParserSpec,
} from "./temporal-parse.js";
import type { FieldEvidenceEntry } from "./validate-data-evidence.js";

/** Channel field use collected during the layer walk (position or color). */
export interface ChannelFieldUse {
  field: string;
  path: string;
}

/** One Map per dataChecks() call — shared by position and color checkers. */
export type TemporalDecisionCache = Map<string, TemporalDecision | null | undefined>;

/**
 * Resolve one field's temporal decision for scale compatibility checks.
 *
 * Memoized per dataChecks() call so multi-layer / multi-channel consumers of
 * the same field under the same parser+options pay O(n) once, not O(U·n).
 * When parser is auto and options match the evidence pass (no timezone /
 * disambiguation), reuse FieldEvidenceEntry.temporal instead of re-scanning.
 *
 * Cache key omits parseFailure and temporalKind — those only affect how the
 * decision is interpreted, not the decision itself.
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
  if (cache.has(key)) return cache.get(key);

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
  cache.set(key, decision);
  return decision;
}

export function appendTemporalKindMismatch(
  errors: SpecError[],
  input: {
    axis: "x" | "y";
    path: string;
    field: string;
    expected: "date" | "datetime" | undefined;
    actual: "date" | "datetime" | null;
  },
): void {
  const { axis, path, field, expected, actual } = input;
  if (expected === undefined || actual === null || actual === expected) return;
  errors.push({
    code: "scale-type-mismatch",
    path,
    message: `scales.${axis}.temporalKind is "${expected}" but field "${field}" parses as ${actual}.`,
    fix: {
      description: `Use temporalKind "${actual}" or choose a parser that produces ${expected} values.`,
    },
  });
}
