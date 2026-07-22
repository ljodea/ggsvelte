/**
 * Group geometry batches by panel once (issue #185 / SVG #438 follow-up):
 * O(P + B) bucket allocation + one pass over batches, instead of re-scanning
 * the full batch list per panel (O(P·B)). Within each panel bucket, order
 * matches the original batch list so paint order is preserved.
 *
 * Pure (no DOM) so both the canvas stratum drawer and the pure SVG renderer
 * can share the same contract.
 *
 * When `withIndices` is true, also record each batch's original list index
 * for focus-mask alignment on the canvas presentation path.
 */
import type { GeometryBatch } from "./scene.js";

export function groupBatchesByPanel(
  panelCount: number,
  batches: readonly GeometryBatch[],
  withIndices: boolean,
): { byPanel: GeometryBatch[][]; indices: number[][] | null } {
  const byPanel: GeometryBatch[][] = Array.from({ length: panelCount }, () => []);
  const indices: number[][] | null = withIndices
    ? Array.from({ length: panelCount }, () => [])
    : null;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    const p = batch.panelIndex;
    // Malformed panelIndex (NaN, non-integer, out of range) is a pipeline bug;
    // skip rather than throw so a bad batch cannot take down the whole stratum
    // draw. Integer check matters: `byPanel[1.5]` / `byPanel[NaN]` are not
    // real buckets, and the old filter path silently dropped those too.
    if (!Number.isInteger(p) || p < 0 || p >= panelCount) continue;
    byPanel[p]!.push(batch);
    indices?.[p]!.push(i);
  }
  return { byPanel, indices };
}
