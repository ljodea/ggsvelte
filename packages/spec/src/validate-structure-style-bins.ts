/**
 * Structural well-formedness for binned numeric/finite style scales.
 * Mirrors runtime checks in scale-style-numeric.ts / scale-style-finite.ts:
 * authored breaks must be finite + strictly increasing, and when both domain
 * and breaks are authored their endpoints must agree.
 *
 * Independent of parseFailure and of data — recovery bounds must themselves
 * be valid or the runtime throws style-binned-breaks / style-domain-invalid.
 *
 * Temporal binned-style configs defer break resolution to validate()/runtime
 * so this module stays free of `@js-temporal/polyfill` (render-path structural
 * gate).
 */
import type { SpecError } from "./errors.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const BINNED_STYLE_AESTHETICS = ["size", "linewidth", "alpha", "shape", "linetype"] as const;

const ISO_LIKE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** Mirror core cellToNumber for non-temporal style boundary resolution. */
function nonTemporalSemantic(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (value instanceof Date) {
    const epochMs = value.getTime();
    return Number.isFinite(epochMs) ? epochMs : undefined;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    if (ISO_LIKE.test(value)) {
      const epochMs = Date.parse(value);
      if (Number.isFinite(epochMs)) return epochMs;
    }
    if (value.trim() === "") return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
}

function resolveBoundarySemantics(
  values: readonly unknown[],
  config: Record<string, unknown>,
): number[] | null {
  const requestsTemporal =
    config["temporalKind"] !== undefined ||
    config["parse"] !== undefined ||
    config["timezone"] !== undefined ||
    config["disambiguation"] !== undefined;

  // Temporal polyfill stays off the structural-gate import graph. Full
  // validate() / runtime still enforces temporal binned style boundaries.
  if (requestsTemporal) return null;

  const mapped: number[] = [];
  for (const value of values) {
    const semantic = nonTemporalSemantic(value);
    if (semantic === undefined) return null;
    mapped.push(semantic);
  }
  return mapped;
}

function isStrictlyIncreasing(boundaries: readonly number[]): boolean {
  for (let index = 1; index < boundaries.length; index++) {
    const prev = boundaries[index - 1];
    const current = boundaries[index];
    if (prev === undefined || current === undefined || current <= prev) return false;
  }
  return true;
}

/**
 * Config-only checks for binned size/linewidth/alpha/shape/linetype scales.
 * Runs whenever the scale object is schema-valid (same cadence as color
 * structural checks).
 */
export function binnedStyleScaleStructuralErrors(scales: Record<string, unknown>): SpecError[] {
  const errors: SpecError[] = [];
  for (const aesthetic of BINNED_STYLE_AESTHETICS) {
    const config = scales[aesthetic];
    if (!isRecord(config) || config["type"] !== "binned") continue;

    const authoredBreaks = Array.isArray(config["breaks"]) ? config["breaks"] : undefined;
    if (authoredBreaks === undefined) continue;

    // Schema already enforces minItems: 2; still guard for partial schema paths.
    if (authoredBreaks.length < 2) {
      errors.push({
        code: "scale-binned-breaks",
        path: `/scales/${aesthetic}/breaks`,
        message: `The ${aesthetic} boundaries must be finite and strictly increasing.`,
        fix: {
          description: "Provide at least two strictly increasing boundary values.",
          example: [0, 10, 20],
        },
      });
      continue;
    }

    const breakSemantics = resolveBoundarySemantics(authoredBreaks, config);
    if (breakSemantics === null || !isStrictlyIncreasing(breakSemantics)) {
      // null: unparseable or temporal-deferred — skip (runtime/validate covers it)
      // non-increasing: emit when we fully resolved non-temporal numbers
      if (breakSemantics !== null) {
        errors.push({
          code: "scale-binned-breaks",
          path: `/scales/${aesthetic}/breaks`,
          message: `The ${aesthetic} boundaries must be finite and strictly increasing.`,
          fix: {
            description:
              "Provide 2+ strictly increasing boundaries that parse under the scale's parser.",
            example:
              aesthetic === "size" || aesthetic === "linewidth" || aesthetic === "alpha"
                ? [0, 10, 20]
                : [0, 1, 2],
          },
        });
      }
      continue;
    }

    const domain = Array.isArray(config["domain"]) ? config["domain"] : undefined;
    if (domain === undefined || domain.length !== 2) continue;

    const domainSemantics = resolveBoundarySemantics(domain, config);
    if (domainSemantics === null || domainSemantics.length !== 2) {
      continue;
    }

    const first = breakSemantics[0]!;
    const last = breakSemantics.at(-1)!;
    if (domainSemantics[0] !== first || domainSemantics[1] !== last) {
      errors.push({
        code: "scale-binned-domain",
        path: `/scales/${aesthetic}/domain`,
        message: `The ${aesthetic} binned domain must match its first and last boundaries.`,
        fix: {
          description: "Set domain to the first and last break values, or omit domain.",
          example: [first, last],
        },
      });
    }
  }
  return errors;
}
