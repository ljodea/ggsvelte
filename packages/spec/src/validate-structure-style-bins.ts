/**
 * Structural well-formedness for binned numeric/finite style scales.
 * Mirrors runtime checks in scale-style-numeric.ts / scale-style-finite.ts:
 * authored breaks must be finite + strictly increasing, and when both domain
 * and breaks are authored their endpoints must agree.
 *
 * Independent of parseFailure and of data — recovery bounds must themselves
 * be valid or the runtime throws style-binned-breaks / style-domain-invalid.
 */
import type { SpecError } from "./errors.js";
import { parseTemporalColumn } from "./temporal-column.js";
import { parseTemporal } from "./temporal-parse.js";
import { temporalParserUsable } from "./validate-data-checks-temporal.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const BINNED_STYLE_AESTHETICS = ["size", "linewidth", "alpha", "shape", "linetype"] as const;

/** Mirror core cellToNumber for non-temporal style boundary resolution. */
function nonTemporalSemantic(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (value instanceof Date) {
    const epochMs = value.getTime();
    return Number.isFinite(epochMs) ? epochMs : undefined;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const iso = parseTemporal(value, "iso");
    if (iso.ok) return iso.epochMs;
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

  if (!requestsTemporal) {
    const mapped: number[] = [];
    for (const value of values) {
      const semantic = nonTemporalSemantic(value);
      if (semantic === undefined) return null;
      mapped.push(semantic);
    }
    return mapped;
  }

  // Schema-invalid temporal inputs still reach structure checks; defer rather
  // than throw inside the temporal helpers (same gate as data-aware checks).
  if (!temporalParserUsable(config["parse"])) return null;
  if (config["timezone"] !== undefined && typeof config["timezone"] !== "string") return null;
  if (config["disambiguation"] !== undefined && typeof config["disambiguation"] !== "string") {
    return null;
  }

  const options = {
    ...(typeof config["timezone"] === "string" && { timezone: config["timezone"] }),
    ...(typeof config["disambiguation"] === "string" && {
      disambiguation: config["disambiguation"] as "compatible" | "earlier" | "later" | "reject",
    }),
  };
  const parser = (config["parse"] ?? "auto") as Parameters<typeof parseTemporalColumn>[1];
  const column = parseTemporalColumn(values, parser, options);
  const mapped: number[] = [];
  for (let index = 0; index < values.length; index++) {
    if (column.valid[index] !== 1) return null;
    const epochMs = column.semantic[index];
    if (epochMs === undefined || !Number.isFinite(epochMs)) return null;
    mapped.push(epochMs);
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
      // Malformed breaks are the primary diagnostic; skip domain agreement.
      continue;
    }

    const domain = Array.isArray(config["domain"]) ? config["domain"] : undefined;
    if (domain === undefined || domain.length !== 2) continue;

    const domainSemantics = resolveBoundarySemantics(domain, config);
    if (domainSemantics === null || domainSemantics.length !== 2) {
      // Unparseable domain is a separate runtime style-domain-invalid path; the
      // censor-recovery check covers type-mismatch. Only emit agreement here when
      // both sides fully resolve.
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
