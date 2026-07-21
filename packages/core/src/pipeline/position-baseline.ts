/**
 * Shared zero baseline for zero-baseline geoms (bar, col, area, histogram,
 * density) — one helper so no baseline independently reimplements the
 * transform-space origin rule.
 *
 * Identity and sqrt: forward(0) = 0, so the transformed-space baseline is 0.
 * log10 has no semantic-zero image (log10(0) is invalid); ggplot2 stacks and
 * dodges log10 bars/areas from the transformed-space origin 0 (semantic
 * inverse 1) without ever evaluating log10(0). All three transforms therefore
 * share the same literal transformed-space baseline: 0.
 */
import type { ScaleTransform } from "../scales/transform.js";

export function transformedZeroBaseline(_transform: ScaleTransform): number {
  return 0;
}
