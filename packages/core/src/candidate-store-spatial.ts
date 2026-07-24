/**
 * Spatial shortlist indexes + geometry refine helpers for an assembled candidate store.
 *
 * - candidate-store-spatial-index.ts — build trees + shortlist APIs
 * - candidate-store-spatial-refine.ts — exactDistance / intersects via hit-geometry table
 */
import type { CandidateStoreIndexes } from "./candidate-store-indexes.js";
import { buildSpatialIndex, type SpatialIndex } from "./candidate-store-spatial-index.js";
import { createSpatialRefine, type SpatialRefine } from "./candidate-store-spatial-refine.js";

export type CandidateSpatialQuery = SpatialIndex & SpatialRefine;

/** Build spatial shortlist indexes and geometry refine helpers for an eager store. */
export function buildCandidateSpatialQuery(indexes: CandidateStoreIndexes): CandidateSpatialQuery {
  const index = buildSpatialIndex(indexes);
  const refine = createSpatialRefine(indexes);
  // Bind via arrows so type-aware unbound-method is satisfied (methods close over
  // module state only; they do not use `this`).
  return {
    spatial: index.spatial,
    isPoint: index.isPoint,
    maxPointReach: index.maxPointReach,
    pointBatchIndexes: index.pointBatchIndexes,
    addExtendedIntersecting: (loX, loY, hiX, hiY, into) => {
      index.addExtendedIntersecting(loX, loY, hiX, hiY, into);
    },
    exactDistance: (id, px, py, pathContainment) =>
      refine.exactDistance(id, px, py, pathContainment),
    intersects: (id, loX, loY, hiX, hiY) => refine.intersects(id, loX, loY, hiX, hiY),
    shortlistNearest: (px, py, mode, maxDistance) =>
      index.shortlistNearest(px, py, mode, maxDistance),
  };
}
