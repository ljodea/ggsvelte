/**
 * Agent-facing error contract (plan: "Validation for agents") + helpers.
 * Every validation diagnostic is a SpecError:
 *
 *   { code, path, message, allowed?, fix? }
 *
 * The stable ERROR_CATALOG lives in error-catalog.ts and is re-exported here
 * so package and deep imports keep the ./errors.js path.
 *
 * "Did you mean" suggestions use a small Levenshtein distance so agents get a
 * concrete correction for typo'd geoms/channels/params.
 */
import type { JSONValue } from "./portability.js";
import type { SpecErrorCode } from "./error-catalog.js";

export {
  ERROR_CATALOG,
  ERROR_CODES,
  type ErrorCatalogEntry,
  type SpecErrorCode,
} from "./error-catalog.js";

export interface SpecErrorFix {
  description: string;
  example?: JSONValue;
}

export interface SpecError {
  code: SpecErrorCode;
  path: string;
  message: string;
  allowed?: string[];
  fix?: SpecErrorFix;
}

/** Thrown by builder .spec() / render entry points when validation fails. */
export class SpecValidationError extends Error {
  readonly errors: readonly SpecError[];

  constructor(errors: readonly SpecError[]) {
    const lines = errors.map((e) => `  [${e.code}] ${e.path || "/"}: ${e.message}`);
    super(
      `Invalid plot spec (${errors.length} error${errors.length === 1 ? "" : "s"}):\n` +
        lines.join("\n"),
    );
    this.name = "SpecValidationError";
    this.errors = errors;
  }
}

/** Classic dynamic-programming Levenshtein distance (small inputs only). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = Array.from({ length: n + 1 }, () => 0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}

/**
 * The closest candidate within an input-length-scaled distance budget
 * (<= max(1, floor(len/3)) edits, case-insensitive), or undefined.
 */
export function didYouMean(input: string, candidates: readonly string[]): string | undefined {
  const budget = Math.max(1, Math.floor(input.length / 3));
  let best: string | undefined;
  let bestDist = budget + 1;
  for (const candidate of candidates) {
    const d = levenshtein(input.toLowerCase(), candidate.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best;
}
