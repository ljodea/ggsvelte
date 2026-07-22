/**
 * Spatial shortlist indexes + geometry refine helpers for an eager candidate store.
 *
 * - candidate-store-spatial-index.ts — build trees + shortlist APIs
 * - candidate-store-spatial-refine.ts — exactDistance / intersects
 */
import type { CandidateStoreIndexes } from "./candidate-store-indexes.js";
import { buildSpatialIndex, type SpatialIndex } from "./candidate-store-spatial-index.js";
import { createSpatialRefine, type SpatialRefine } from "./candidate-store-spatial-refine.js";

export type CandidateSpatialQuery = SpatialIndex & SpatialRefine;

/** Build spatial shortlist indexes and geometry refine helpers for an eager store. */
export function buildCandidateSpatialQuery(indexes: CandidateStoreIndexes): CandidateSpatialQuery {
  const index = buildSpatialIndex(indexes);
  const { exactDistance, intersects } = createSpatialRefine(indexes);
  return {
    spatial: index.spatial,
    isPoint: index.isPoint,
    maxPointReach: index.maxPointReach,
    pointBatchIndexes: index.pointBatchIndexes,
    addExtendedIntersecting: index.addExtendedIntersecting,
    exactDistance,
    intersects,
    shortlistNearest: index.shortlistNearest,
  };
}
