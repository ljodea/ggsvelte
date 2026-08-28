import { compareTokens } from "./candidate-axis-token.js";
import type { CanonicalAxisToken } from "./candidate-axis-token.js";
import type { BucketBoundary, SeriesBoundary } from "./candidate-store-index-types.js";
import type { Scene } from "./scene.js";

type AxisGroupTables = {
  permutations: Record<"x" | "y", Uint32Array>;
  buckets: Record<"x" | "y", Map<number, BucketBoundary>>;
};

/**
 * Exclusive end of the (layer, series) run starting at `from` within
 * `valid[0..end)` — extracted to keep the bucket walk under the nesting
 * budget and to give the hot scan a tight local frame.
 */
function seriesRunEnd(
  valid: number[],
  from: number,
  end: number,
  layerPerCandidate: Uint32Array,
  series: Uint32Array,
  layerIndex: number,
  seriesId: number,
): number {
  let cursor = from + 1;
  while (cursor < end) {
    const id = valid[cursor]!;
    if (layerPerCandidate[id]! !== layerIndex || series[id] !== seriesId) break;
    cursor++;
  }
  return cursor;
}

type LazyCandidateAxisGroupsInput = {
  readonly scene: Scene;
  readonly n: number;
  readonly flip: boolean;
  readonly tokens: CanonicalAxisToken[];
  readonly batchIds: Uint32Array;
  readonly panelIds: Uint32Array;
  readonly ranks: Uint32Array;
  readonly series: Uint32Array;
  readonly sources: Uint32Array;
  readonly xTokenIds: Int32Array;
  readonly yTokenIds: Int32Array;
  readonly xs: Float32Array;
  readonly ys: Float32Array;
};

/**
 * Axis-group tables (permutation + bucket boundaries) serve group() ONLY.
 * Building them eagerly cost an O(u log u) token-rank sort and O(n)
 * bucket-map writes on every store build — including first-hover sessions
 * that never group. Build once, on first group(), memoized. `valid` is a
 * fresh identity-filter (the eager path filtered `order`, which is scratch
 * and cleared below); contents are identical.
 */
export function createLazyCandidateAxisGroups(
  input: LazyCandidateAxisGroupsInput,
): () => AxisGroupTables {
  const {
    scene,
    n,
    flip,
    tokens,
    batchIds,
    panelIds,
    ranks,
    series,
    sources,
    xTokenIds,
    yTokenIds,
    xs,
    ys,
  } = input;
  let axisGroupTables: AxisGroupTables | null = null;
  const axisGroups = (): AxisGroupTables => {
    if (axisGroupTables !== null) return axisGroupTables;
    const permutations: Record<"x" | "y", Uint32Array> = {
      x: new Uint32Array(0),
      y: new Uint32Array(0),
    };
    const buckets: Record<"x" | "y", Map<number, BucketBoundary>> = {
      x: new Map<number, BucketBoundary>(),
      y: new Map<number, BucketBoundary>(),
    };
    // Rank tokens once (m log m, m = unique tokens) so the permutation sort's
    // hot comparator is arithmetic instead of compareTokens object dispatch.
    // Ranks preserve compareTokens order exactly.
    const tokenRank = new Int32Array(tokens.length);
    {
      const tokenOrder = Array.from({ length: tokens.length }, (_, id) => id);
      tokenOrder.sort((a, b) => compareTokens(tokens[a]!, tokens[b]!));
      for (let rank = 0; rank < tokenOrder.length; rank++) tokenRank[tokenOrder[rank]!] = rank;
    }
    // Per-candidate layer ids, read once — the permutation comparator and the
    // bucket boundary walk otherwise chase scene.batches[…].layerIndex per
    // comparison.
    const layerPerCandidate = new Uint32Array(n);
    for (let id = 0; id < n; id++) layerPerCandidate[id] = scene.batches[batchIds[id]!]!.layerIndex;
    // Bucket maps key on panel * tokenCount + tokenId (numeric, no per-bucket
    // `${panel}|${key}` strings — dense plots have O(n) buckets).
    const tokenCount = Math.max(tokens.length, 1);
    const bucketKey = (panel: number, tokenId: number): number => panel * tokenCount + tokenId;
    for (const axis of ["x", "y"] as const) {
      const keys = axis === "x" ? xTokenIds : yTokenIds,
        orth = axis === "x" ? (flip ? xs : ys) : flip ? ys : xs;
      const valid: number[] = [];
      for (let id = 0; id < n; id++) if (keys[id] !== -1) valid.push(id);
      valid.sort(
        (a, b) =>
          panelIds[a]! - panelIds[b]! ||
          tokenRank[keys[a]!]! - tokenRank[keys[b]!]! ||
          ranks[a]! - ranks[b]! ||
          layerPerCandidate[a]! - layerPerCandidate[b]! ||
          series[a]! - series[b]! ||
          orth[a]! - orth[b]! ||
          batchIds[a]! - batchIds[b]! ||
          sources[a]! - sources[b]!,
      );
      const permutation = Uint32Array.from(valid);
      permutations[axis] = permutation;
      for (let start = 0; start < valid.length;) {
        const first = valid[start]!;
        const panel = panelIds[first]!;
        const key = keys[first]!;
        let end = start + 1;
        while (end < valid.length && panelIds[valid[end]!] === panel && keys[valid[end]!] === key)
          end++;
        const seriesBoundaries: SeriesBoundary[] = [];
        for (let seriesStart = start; seriesStart < end;) {
          const seriesFirst = valid[seriesStart]!;
          const layerIndex = layerPerCandidate[seriesFirst]!;
          const seriesId = series[seriesFirst]!;
          const seriesEnd = seriesRunEnd(
            valid,
            seriesStart,
            end,
            layerPerCandidate,
            series,
            layerIndex,
            seriesId,
          );
          seriesBoundaries.push({ start: seriesStart, end: seriesEnd, layerIndex, seriesId });
          seriesStart = seriesEnd;
        }
        // The boundaries array is built locally and never mutated after this
        // point; treat as immutable by convention (same contract as the
        // coincident stacks) instead of paying one Object.freeze per bucket —
        // dense plots have O(n) buckets.
        buckets[axis].set(bucketKey(panel, key), {
          start,
          end,
          series: seriesBoundaries,
        });
        start = end;
      }
    }
    axisGroupTables = { permutations, buckets };
    return axisGroupTables;
  };
  return axisGroups;
}
